import data from "./campus.json";
const blend = (a, b, t) => a + (b - a) * t;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const minus = (a, b) => a.map((value, i) => value - b[i]);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normal = vector => {
  const length = Math.hypot(...vector);
  return vector.map(value => value / length);
};

function cameraMatrix(eye, target, aspect, horizontalShift) {
  const z = normal(minus(eye, target));
  const x = normal(cross([0, 1, 0], z));
  const y = cross(z, x);
  const view = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
  const near = 1.5;
  const far = 16000;
  const focusAspect = aspect * (1 - horizontalShift);
  const f = Math.min(1, focusAspect / 1.13) / Math.tan(Math.PI * 45 / 360);
  const proj = [f / aspect, 0, 0, 0, 0, f, 0, 0, -horizontalShift, 0, (near + far) / (near - far), -1,
    0, 0, 2 * near * far / (near - far), 0];
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) out[i * 4 + j] += proj[k * 4 + j] * view[i * 4 + k];
    }
  }
  return out;
}

function projectPoint(point, matrix, width, height, offsetX) {
  const [x, y, z] = point;
  const clipX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
  const clipY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
  const clipW = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  if (clipW < 1.5) return null;
  return [width * (.5 + clipX / (2 * clipW)) - offsetX, height * (.5 - clipY / (2 * clipW))];
}

function viewPlanes(matrix) {
  const planes = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [-1, 1]) {
      planes.push([0, 4, 8, 12].map(i => matrix[i + 3] + sign * matrix[i + axis]));
    }
  }
  return planes;
}

function insideView(bounds, planes) {
  const [lo, hi] = bounds;
  return planes.every(([a, b, c, d]) =>
    a * (a >= 0 ? hi[0] : lo[0]) + b * (b >= 0 ? hi[1] : lo[1]) +
    c * (c >= 0 ? hi[2] : lo[2]) + d >= 0);
}

function makeScenes(data) {
  const center = data.campusCenter;
  const pick = (point, bias, range, height, angle) => ({
    point: center.map((value, i) => blend(value, point[i], bias)),
    range, height, angle,
  });
  const [first, second] = data.antennas.map(node => node.point);
  const middle = first.map((value, i) => (value + second[i]) / 2);
  const overview = pick(center, 0, 1410, 2280, -.21);
  return [
    { ...overview, angle: -.28 },
    overview,
    pick(data.buildings[0].point, .93, 600, 970, -.27),
    pick(first, 1, 315, 510, -.26),
    pick(middle, .82, 500, 810, -.12),
    pick(middle, 1, 420, 680, -.18),
  ];
}

function bindScroll(root, sections, invalidate) {
  const nav = [...root.querySelectorAll("[data-campus-nav] a")];
  const progress = root.querySelector("[data-campus-progress]");
  let anchors = [];
  let current = -1;

  function measure() {
    const chapterAnchors = sections.slice(1).flatMap(section => {
      const { top, height } = section.getBoundingClientRect();
      const start = top + scrollY - (parseFloat(getComputedStyle(section).scrollMarginTop) || 0);
      return section.hasAttribute("data-campus-lab-zoom") ? [start, start + height * .46] : [start];
    });
    anchors = [0, ...chapterAnchors];
    invalidate();
  }

  addEventListener("scroll", invalidate, { passive: true });
  addEventListener("resize", measure, { passive: true });
  const resize = new ResizeObserver(measure);
  resize.observe(root);
  document.fonts?.ready.then(measure);
  measure();

  return () => {
    const location = anchors.findIndex((anchor, i) => i > 0 && scrollY < anchor);
    const i = location < 0 ? anchors.length - 1 : location - 1;
    const t = location < 0 ? 0 : clamp((scrollY - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]), 0, 1);
    const chapter = Math.round(i + t);
    if (chapter !== current) {
      const active = chapter === 0 ? -1 : chapter === 1 ? 0 : chapter <= 3 ? 1 : 2;
      nav.forEach((link, index) => {
        if (index === active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      current = chapter;
    }
    progress.value = clamp((scrollY - anchors[0]) / Math.max(1, anchors.at(-1) - anchors[0]), 0, 1);
    return { i, t, chapter };
  };
}

function makeProgram(gl) {
  const vs = `#version 300 es
    layout(location=0) in vec3 position;
    layout(location=1) in vec2 texcoord;
    uniform mat4 mvp;
    uniform vec3 meshOffset;
    uniform vec3 meshRange;
    out vec3 world;
    out vec2 uv;
    void main() {
      world = meshOffset + position * meshRange;
      uv = texcoord;
      gl_Position = mvp * vec4(world, 1.);
    }`;
  const fs = `#version 300 es
    precision highp float;
    in vec3 world;
    in vec2 uv;
    out vec4 pixel;
    uniform sampler2D photoAtlas;
    uniform bool showPhoto;
    uniform vec2 fadeCenter;
    uniform vec2 fadeDistances;
    uniform vec3 paper;
    uniform vec3 mesh;
    uniform vec3 ink;
    void main() {
      vec3 vector = cross(dFdx(world), dFdy(world));
      vec3 n = vector / max(length(vector), .00001);
      if (n.y < 0.) n = -n;
      vec3 dir = normalize(vec3(-.82, 1.2, .65));
      float light = max(0., dot(n, dir));
      float upright = abs(n.y);
      float dark = .25 * (1. - light) + .12 * (1. - upright);
      vec3 color = showPhoto ? texture(photoAtlas, uv).rgb : mix(mesh, ink, dark);
      float fade = smoothstep(fadeDistances.x, fadeDistances.y, distance(world.xz, fadeCenter));
      float neutral = dot(color, vec3(.2126, .7152, .0722));
      color = mix(color, vec3(neutral) * vec3(1.02, 1., .96), fade * .72);
      pixel = vec4(mix(color, paper, fade), 1.);
    }`;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const shaders = [compile(gl.VERTEX_SHADER, vs), compile(gl.FRAGMENT_SHADER, fs)];
  const program = gl.createProgram();
  for (const shader of shaders) gl.attachShader(program, shader);
  gl.linkProgram(program);
  for (const shader of shaders) gl.deleteShader(shader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return program;
}

function makeRenderer(gl, data, stage) {
  const program = makeProgram(gl);
  gl.useProgram(program);
  const uniform = name => gl.getUniformLocation(program, name);
  const mvp = uniform("mvp");
  const meshOffset = uniform("meshOffset"), meshRange = uniform("meshRange");
  const showPhoto = uniform("showPhoto");
  gl.uniform2f(uniform("fadeCenter"), data.campusCenter[0], data.campusCenter[2]);
  gl.uniform2fv(uniform("fadeDistances"), new Float32Array(data.fadeDistancesM));
  gl.enable(gl.DEPTH_TEST);
  const palette = [
    [uniform("paper"), "--paper"],
    [uniform("mesh"), "--rule"],
    [uniform("ink"), "--ink"],
  ];
  let paper;
  function applyPalette() {
    const style = getComputedStyle(stage);
    const nextPaper = style.getPropertyValue("--paper").trim();
    if (paper === nextPaper) return;
    paper = nextPaper;
    for (const [location, property] of palette) {
      const rgb = style.getPropertyValue(property).trim().slice(1).match(/.{2}/g)
        .map(pair => parseInt(pair, 16) / 255);
      gl.uniform3fv(location, rgb);
      if (property === "--paper") gl.clearColor(...rgb, 1);
    }
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(uniform("photoAtlas"), 0);
  const fallback = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, fallback);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([214, 208, 194, 255]));

  function unpackTracks(blob, nVertices, count, width, indexOffset) {
    const vertexSteps = new Uint8Array(blob, 16, nVertices * 10);
    const perByte = nVertices * 5;
    const vertices = new Uint16Array(perByte);
    for (let field = 0; field < 5; field++) {
      let value = 0;
      const base = field * nVertices;
      for (let vertex = 0; vertex < nVertices; vertex++) {
        const at = base + vertex;
        value = (value + (vertexSteps[at] | vertexSteps[at + perByte] << 8)) & 65535;
        vertices[vertex * 5 + field] = value;
      }
    }
    const indexSteps = new Uint8Array(blob, indexOffset, count * width);
    const indices = width === 2 ? new Uint16Array(count) : new Uint32Array(count);
    let index = 0;
    for (let i = 0; i < count; i++) {
      let step = indexSteps[i] | indexSteps[i + count] << 8;
      if (width === 4) step |= indexSteps[i + 2 * count] << 16 | indexSteps[i + 3 * count] << 24;
      index = width === 2 ? (index + step) & 65535 : (index + step) >>> 0;
      indices[i] = index;
    }
    return { vertices, indices };
  }

  function upload(blob, chunk) {
    const view = new DataView(blob);
    if (view.byteLength < 16) throw new Error("Cabecera de malla incorrecta");
    const magic = view.getUint32(0);
    const delta = magic === 0x54354734;
    const quantized = delta || magic === 0x54354733;
    const fields = quantized || magic === 0x54354732 ? 5 : magic === 0x54354731 ? 3 : 0;
    if (!fields) throw new Error("Cabecera de malla incorrecta");
    const nVertices = view.getUint32(4, true);
    const count = view.getUint32(8, true);
    const width = view.getUint32(12, true);
    const fieldBytes = quantized ? 2 : 4;
    const stride = fields * fieldBytes;
    const vertexEnd = 16 + nVertices * stride;
    const indexOffset = quantized && !delta ? Math.ceil(vertexEnd / width) * width : vertexEnd;
    if ((width !== 2 && width !== 4) || count % 3 || indexOffset + width * count !== blob.byteLength) {
      throw new Error("Tamaño de malla incorrecto");
    }
    const VertexArray = quantized ? Uint16Array : Float32Array;
    const { vertices, indices } = delta ? unpackTracks(blob, nVertices, count, width, indexOffset) : {
      vertices: new VertexArray(blob, 16, nVertices * fields),
      indices: width === 2 ? new Uint16Array(blob, indexOffset, count) : new Uint32Array(blob, indexOffset, count),
    };
    const parts = fields === 5 ? (chunk.parts || []).map(item => ({ ...item, texture: null })) : [];
    if (parts.some(part => part.count < 0 || part.start < 0 || part.count % 3 || part.start + part.count > count)) {
      throw new Error("Índices de fotografía incorrectos");
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const vertexType = quantized ? gl.UNSIGNED_SHORT : gl.FLOAT;
    gl.vertexAttribPointer(0, 3, vertexType, quantized, stride, 0);
    gl.enableVertexAttribArray(0);
    if (fields === 5) {
      gl.vertexAttribPointer(1, 2, vertexType, quantized, stride, 3 * fieldBytes);
      gl.enableVertexAttribArray(1);
    }
    const elements = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const [low, high] = chunk.bounds;
    return { vao, position, elements, count, width, parts,
      offset: quantized ? low : [0, 0, 0],
      extent: quantized ? high.map((value, i) => value - low[i]) : [1, 1, 1],
      type: width === 2 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, bounds: chunk.bounds };
  }

  async function uploadPhoto(part, source, detail, size, canUpload) {
    const options = { imageOrientation: "from-image", colorSpaceConversion: "none" };
    const image = size
      ? await createImageBitmap(source, { ...options, resizeWidth: size, resizeHeight: size, resizeQuality: "high" })
        .catch(() => createImageBitmap(source, options))
      : await createImageBitmap(source, options);
    if (!canUpload()) {
      image.close();
      return false;
    }
    const texture = gl.createTexture();
    try {
      let pixels = image;
      if (size && (image.width !== size || image.height !== size)) {
        const resized = document.createElement("canvas");
        resized.width = size;
        resized.height = size;
        const context = resized.getContext("2d");
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, size, size);
        pixels = resized;
      }
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    } catch (error) {
      gl.deleteTexture(texture);
      throw error;
    } finally {
      image.close();
    }
    if (detail) {
      if (part.detailTexture) gl.deleteTexture(part.detailTexture);
      part.detailTexture = texture;
    } else {
      part.texture = texture;
    }
    return true;
  }

  function discardDetail(part) {
    gl.deleteTexture(part.detailTexture);
    part.detailTexture = null;
  }

  function render(w, h, matrix, planes, chunks, photoMode) {
    applyPalette();
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(mvp, false, matrix);
    gl.activeTexture(gl.TEXTURE0);
    for (const chunk of chunks) {
      if (!insideView(chunk.bounds, planes)) continue;
      gl.uniform3fv(meshOffset, chunk.offset);
      gl.uniform3fv(meshRange, chunk.extent);
      gl.bindVertexArray(chunk.vao);
      if (!photoMode || !chunk.parts.length) {
        gl.uniform1i(showPhoto, 0);
        gl.bindTexture(gl.TEXTURE_2D, fallback);
        gl.drawElements(gl.TRIANGLES, chunk.count, chunk.type, 0);
        continue;
      }
      for (const part of chunk.parts) {
        const texture = part.detailTexture || part.texture;
        gl.uniform1i(showPhoto, Number(Boolean(texture)));
        gl.bindTexture(gl.TEXTURE_2D, texture || fallback);
        gl.drawElements(gl.TRIANGLES, part.count, chunk.type, part.start * chunk.width);
      }
    }
  }
  return { upload, uploadPhoto, discardDetail, render };
}

function distanceToBounds(bounds, point) {
  const [low, high] = bounds;
  return Math.hypot(Math.max(low[0] - point[0], point[0] - high[0], 0),
    Math.max(low[2] - point[2], point[2] - high[2], 0));
}

function projectedTileSize(bounds, matrix, width, height) {
  const [low, high] = bounds;
  const elevation = (low[1] + high[1]) / 2;
  const corners = [
    [low[0], elevation, low[2]], [low[0], elevation, high[2]],
    [high[0], elevation, low[2]], [high[0], elevation, high[2]],
  ];
  const points = corners.map(point => projectPoint(point, matrix, width, height, 0)).filter(Boolean);
  if (points.length < 2) return 0;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const visibleWidth = Math.min(width, Math.max(...xs)) - Math.max(0, Math.min(...xs));
  const visibleHeight = Math.min(height, Math.max(...ys)) - Math.max(0, Math.min(...ys));
  return Math.max(visibleWidth, visibleHeight, 0);
}

function base64Bytes(payload) {
  if (typeof Uint8Array.fromBase64 === "function") return Uint8Array.fromBase64(payload);
  const text = atob(payload);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes;
}

async function fetchModelAsset(path, baseURL, priority) {
  const url = new URL(path, baseURL);
  if (url.origin !== location.origin) throw new Error("Campus model assets must use the site origin");
  const response = await fetch(url, { redirect: "error", priority });
  if (!response.ok) throw new Error(`Campus model asset is unavailable: ${url.pathname}`);
  return response;
}

async function chunkData(chunk, baseURL, priority) {
  const buffer = chunk.payload
    ? base64Bytes(chunk.payload).buffer
    : await (await fetchModelAsset(chunk.url, baseURL, priority)).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // The browser already decodes tiles served with HTTP Content-Encoding: gzip.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return buffer;
  const body = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(body).arrayBuffer();
}

const hasPhoto = part => Boolean(part.photoUrl || part.photo);

function makeLoader(chunks, renderer, baseURL, center, hasPhotos, updated) {
  const available = [];
  const ordered = chunks.slice().sort((a, b) => distanceToBounds(a.bounds, center) - distanceToBounds(b.bounds, center));
  const entries = ordered.map(chunk => ({
    chunk,
    photoCount: hasPhotos ? (chunk.parts || []).filter(hasPhoto).length : 0,
    state: "queued",
  }));
  const originalPaths = hasPhotos
    ? [...new Set(ordered.flatMap(chunk => (chunk.parts || []).map(part => part.photoUrl)).filter(Boolean))]
    : [];
  const originals = new Map();
  const prefetched = new Set();
  const residentDetails = new Map();
  const detailBudget = 64 * 1024 ** 2;
  const detailLevels = [512, 1024, 2048].map(size => size ** 2 * 4);
  const photoCount = entries.reduce((sum, entry) => sum + entry.photoCount, 0);
  const settled = state => state === "ready" || state === "failed";
  let visible = [];
  let visibleSet = new Set();
  let detailTargets = new Map();
  let photographs = hasPhotos, firstView = true, stopped = false, prefetching = false;
  let pendingMeshes = 0, pendingPhotos = 0, backgroundMeshes = 0, backgroundPhotos = 0;
  let detailBytes = 0, failures = 0;

  function loadMesh(entry, background = false) {
    entry.state = "loading";
    pendingMeshes++;
    if (background) backgroundMeshes++;
    chunkData(entry.chunk, baseURL, background ? "low" : "high").then(async buffer => {
      if (background && !visibleSet.has(entry) && !stopped) {
        await new Promise(resolve => {
          if (typeof requestIdleCallback === "function") requestIdleCallback(resolve, { timeout: 100 });
          else setTimeout(resolve, 24);
        });
      }
      if (stopped) return;
      entry.mesh = renderer.upload(buffer, entry.chunk);
      entry.state = "ready";
      failures += Math.max(0, entry.photoCount - entry.mesh.parts.filter(hasPhoto).length);
      available.push(entry.mesh);
    }).catch(error => {
      entry.state = "failed";
      failures++;
      console.error(error);
    }).finally(() => {
      pendingMeshes--;
      if (background) backgroundMeshes--;
      if (visibleSet.has(entry)) updated();
      pump();
    });
  }

  function fetchOriginal(path, priority) {
    if (!originals.has(path)) {
      const source = fetchModelAsset(path, baseURL, priority).then(response => response.blob()).catch(error => {
        originals.delete(path);
        throw error;
      });
      originals.set(path, source);
    }
    return originals.get(path);
  }

  function originalPhoto(part, priority) {
    if (!part.photoUrl) return Promise.resolve().then(() => new Blob([base64Bytes(part.photo)], { type: part.format }));
    const source = fetchOriginal(part.photoUrl, priority);
    if (part.photoLength === undefined) return source;
    return source.then(blob => blob.slice(part.photoOffset, part.photoOffset + part.photoLength, part.format));
  }

  function loadPhoto(entry, part, background = false, targetBytes = 0) {
    const detail = targetBytes > 0;
    const state = detail ? "detailState" : "photoState";
    const priority = background ? "low" : detail ? "auto" : "high";
    const previousBytes = residentDetails.get(part) ?? 0;
    const reservedBytes = detail ? targetBytes - previousBytes : 0;
    detailBytes += reservedBytes;
    part[state] = "loading";
    pendingPhotos++;
    if (background) backgroundPhotos++;
    const source = !detail && part.previewUrl
      ? fetchModelAsset(part.previewUrl, baseURL, priority).then(response => response.blob())
      : originalPhoto(part, priority);
    const canUpload = () => !stopped && (!detail || (
      photographs && visibleSet.has(entry) && (detailTargets.get(part) ?? 0) >= targetBytes
    ));
    source.then(async blob => {
      const size = detail && targetBytes < part.textureBytes ? Math.sqrt(targetBytes / 4) : 0;
      const uploaded = canUpload() && await renderer.uploadPhoto(part, blob, detail, size, canUpload);
      if (!uploaded) {
        part[state] = previousBytes ? "ready" : undefined;
        detailBytes -= reservedBytes;
        return;
      }
      part[state] = "ready";
      if (detail) residentDetails.set(part, targetBytes);
    }).catch(error => {
      part[state] = "failed";
      if (detail) detailBytes -= reservedBytes;
      failures++;
      console.error(error);
    }).finally(() => {
      pendingPhotos--;
      if (background) backgroundPhotos--;
      if (visibleSet.has(entry)) updated();
      pump();
    });
  }

  function planDetail(matrix, width, height) {
    const targets = new Map();
    const desired = new Map();
    let plannedBytes = 0;
    for (const entry of visible) {
      const pixels = projectedTileSize(entry.chunk.bounds, matrix, width, height);
      const level = pixels >= 500 ? 2 : pixels >= 160 ? 1 : 0;
      for (const part of entry.mesh?.parts || []) {
        if (!part.previewUrl) continue;
        const native = part.textureBytes ?? detailLevels[2];
        const baseline = part.textureBytes ? Math.min(native, detailLevels[0]) : native;
        if (plannedBytes + baseline > detailBudget) continue;
        targets.set(part, baseline);
        desired.set(part, Math.min(native, detailLevels[level]));
        plannedBytes += baseline;
      }
    }
    for (const level of detailLevels.slice(1)) {
      for (const [part, current] of targets) {
        const target = Math.min(level, desired.get(part));
        const increase = target - current;
        if (increase <= 0 || plannedBytes + increase > detailBudget) continue;
        targets.set(part, target);
        plannedBytes += increase;
      }
    }
    return targets;
  }

  function discardUnneededDetails() {
    for (const [resident, residentBytes] of residentDetails) {
      if (resident.detailState === "loading" || residentBytes <= (detailTargets.get(resident) ?? 0)) continue;
      renderer.discardDetail(resident);
      resident.detailState = undefined;
      residentDetails.delete(resident);
      detailBytes -= residentBytes;
    }
  }

  function prefetchOriginal() {
    if (prefetching) return;
    const path = originalPaths.find(item => !originals.has(item) && !prefetched.has(item));
    if (!path) return;
    prefetching = true;
    prefetched.add(path);
    fetchOriginal(path, "low").catch(() => {}).finally(() => {
      prefetching = false;
      pump();
    });
  }

  function pumpPhotos() {
    if (pendingPhotos >= 3) return;
    for (const entry of visible) {
      for (const part of entry.mesh?.parts || []) {
        if (!hasPhoto(part)) continue;
        if (pendingPhotos < 3 && !part.photoState) loadPhoto(entry, part);
      }
    }
    if (firstView) return;

    if (pendingPhotos < 3 && !backgroundPhotos) {
      for (const entry of entries) {
        if (visibleSet.has(entry)) continue;
        const part = entry.mesh?.parts.find(item => item.previewUrl && !item.photoState);
        if (!part) continue;
        loadPhoto(entry, part, true);
        break;
      }
    }
    for (const entry of visible) {
      for (const part of entry.mesh?.parts || []) {
        if (pendingPhotos >= 3) return;
        if (!settled(part.photoState) || part.detailState === "loading" || part.detailState === "failed") continue;
        const target = detailTargets.get(part) ?? 0;
        const increase = target - (residentDetails.get(part) ?? 0);
        if (increase > 0 && detailBytes + increase <= detailBudget) loadPhoto(entry, part, false, target);
      }
    }
  }

  function pump() {
    if (stopped) return;
    for (const entry of visible) {
      if (pendingMeshes >= 4) break;
      if (entry.state === "queued") loadMesh(entry);
    }
    if (!firstView) {
      for (const entry of entries) {
        if (pendingMeshes >= 4 || backgroundMeshes >= 2) break;
        if (!visibleSet.has(entry) && entry.state === "queued") loadMesh(entry, true);
      }
    }
    if (!firstView) discardUnneededDetails();
    if (photographs) pumpPhotos();
    if (!firstView) prefetchOriginal();
  }

  return {
    available,
    photoCount,
    get failed() { return failures > 0; },
    visibleProgress() {
      const meshes = visible.filter(entry => settled(entry.state)).length;
      const totalPhotos = visible.reduce((sum, entry) => sum + entry.photoCount, 0);
      const photos = visible.reduce((sum, entry) => {
        if (entry.state === "failed") return sum + entry.photoCount;
        if (!entry.mesh || !entry.photoCount) return sum;
        const remaining = entry.mesh.parts.filter(part => hasPhoto(part) && !settled(part.photoState)).length;
        return sum + entry.photoCount - remaining;
      }, 0);
      return {
        done: meshes + photos,
        total: visible.length + totalPhotos,
        meshesReady: meshes === visible.length,
        terrainAvailable: visible.length > 0 && visible.every(entry => entry.state === "ready"),
      };
    },
    request(matrix, planes, subject, showPhotos, loading, width, height) {
      visible = entries.filter(entry => insideView(entry.chunk.bounds, planes))
        .sort((a, b) => distanceToBounds(a.chunk.bounds, subject) - distanceToBounds(b.chunk.bounds, subject));
      visibleSet = new Set(visible);
      photographs = showPhotos;
      firstView = loading;
      if (firstView || !photographs) detailTargets.clear();
      else detailTargets = planDetail(matrix, width, height);
      pump();
    },
    stop() {
      stopped = true;
      originals.clear();
    },
  };
}

function makeAnnotationLayer(data, canvas, labels, stage, translate, overview, invalidate) {
  const ctx = canvas.getContext("2d");
  let ink, accent, outline;
  const nodes = new Map();
  const northToSouth = data.buildings.map((building, index) => ({ building, index }))
    .sort((a, b) => a.building.point[2] - b.building.point[2]);
  const campusRows = [northToSouth.slice(0, 3), northToSouth.slice(3)]
    .map(row => row.sort((a, b) => a.building.point[0] - b.building.point[0]));
  const [overviewX, overviewY, overviewZ] = overview.point;
  const overviewEye = [
    overviewX + Math.sin(overview.angle) * overview.range,
    overviewY + overview.height,
    overviewZ + Math.cos(overview.angle) * overview.range,
  ];

  function begin(dpr) {
    const style = getComputedStyle(stage);
    ink = style.getPropertyValue("--ink").trim();
    accent = style.getPropertyValue("--accent").trim();
    outline = style.getPropertyValue("--rule").trim();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    for (const badge of nodes.values()) {
      badge.pointerVisible = false;
      badge.labelVisible = false;
    }
  }

  function line(points, project, options) {
    const pixels = points.map(project);
    if (!pixels.some(Boolean)) return;
    ctx.beginPath();
    let started = false;
    for (const point of pixels) {
      if (!point) {
        started = false;
        continue;
      }
      if (started) ctx.lineTo(...point);
      else ctx.moveTo(...point);
      started = true;
    }
    ctx.strokeStyle = options.color || accent;
    ctx.lineWidth = options.width || 1.7;
    ctx.setLineDash(options.dash || []);
    if (options.fill && pixels.every(Boolean)) {
      ctx.closePath();
      ctx.fillStyle = options.fill;
      ctx.fill(options.fillRule || "nonzero");
    }
    ctx.stroke();
  }

  function styleLeader(el, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    el.style.left = ax + "px";
    el.style.top = ay + "px";
    el.style.width = Math.hypot(dx, dy) + "px";
    el.style.transform = "rotate(" + Math.atan2(dy, dx) + "rad)";
  }

  function mark(project, world, title, kind, width, height, occupied, { active = true, slot, labelOffsetX = 24 } = {}) {
    const point = project(world);
    const onMap = point && point[0] >= 12 && point[0] <= width - 12 && point[1] >= 25 && point[1] <= height - 20;
    if (!onMap && !slot) return;
    const key = (slot ? "campus:" : kind + ":") + world.join(",");
    let badge = nodes.get(key);
    if (!badge) {
      const pointer = document.createElement("span");
      const label = document.createElement("span");
      const stem = document.createElement("span");
      const elbow = document.createElement("span");
      pointer.className = "map-target";
      label.className = "map-label " + kind;
      stem.className = "map-leader";
      elbow.className = "map-leader map-leader-elbow";
      labels.append(stem, elbow, pointer, label);
      badge = { pointer, label, stem, elbow, kind, mounted: false };
      nodes.set(key, badge);
    }
    const { pointer, label, stem, elbow } = badge;
    if (label.textContent !== title) label.textContent = title;
    badge.pointerVisible = Boolean(onMap);
    badge.active = active;
    badge.fixedLabel = Boolean(slot);
    if (onMap) {
      pointer.style.left = point[0] + "px";
      pointer.style.top = point[1] + "px";
    }
    if (slot) {
      const [x, y, maxWidth] = slot;
      if (onMap) styleLeader(stem, point[0], point[1], x, y - 10);
      label.style.left = x + "px";
      label.style.top = y + "px";
      label.style.maxWidth = maxWidth ? maxWidth + "px" : "";
      badge.labelVisible = true;
      return;
    }
    const x = clamp(point[0] + labelOffsetX, 85, Math.max(85, width - 85));
    const labelSpacing = kind === "building" ? 134 : 105;
    const overlaps = y => occupied.some(([ox, oy]) => Math.abs(ox - x) < labelSpacing && Math.abs(oy - y) < 22);
    let y = point[1] - 25;
    while (y >= 30 && overlaps(y)) y -= 23;
    if (y < 30) {
      y = point[1] + 32;
      while (y <= height - 20 && overlaps(y)) y += 23;
    }
    if (y > height - 20) return;
    occupied.push([x, y]);
    styleLeader(stem, point[0], point[1], point[0], y + 9);
    styleLeader(elbow, point[0], y + 9, x, y);
    label.style.left = x + "px";
    label.style.top = y + "px";
    badge.labelVisible = true;
  }

  function end() {
    const setState = (node, name, shown) => {
      const value = name + (shown ? " is-shown" : "");
      if (node.className !== value) node.className = value;
    };
    for (const badge of nodes.values()) {
      if (!badge.mounted) {
        badge.mounted = true;
        invalidate();
        continue;
      }
      const active = badge.active ? " is-active" : "";
      const variant = badge.fixedLabel ? " is-campus-building" : "";
      const state = active + variant;
      setState(badge.pointer, "map-target " + badge.kind + state, badge.pointerVisible);
      const showLeader = badge.labelVisible && badge.pointerVisible;
      setState(badge.stem, "map-leader" + state, showLeader);
      setState(badge.elbow, "map-leader map-leader-elbow" + state, showLeader && !badge.fixedLabel);
      setState(badge.label, "map-label " + badge.kind + state, badge.labelVisible);
    }
  }

  function network(project, width, height, occupied) {
    line(data.antennas.map(node => node.point), project, { dash: [5, 6], width: 1.6 });
    for (const [id, node] of data.antennas.entries()) {
      const top = [node.point[0], node.point[1] + 8, node.point[2]];
      line([node.point, top], project, { width: 2 });
      const title = id === 0 ? translate("Polivalente antenna", "Antena del Polivalente") : node.name;
      mark(project, top, `0${id + 1} · ${title}`, "node", width, height, occupied);
    }
  }

  function draw(project, width, height, chapter, highlightedBuilding) {
    if (chapter === 0) return;
    const occupied = [];
    if (chapter === 1) {
      line(data.campusOutline, project, { dash: [5, 5], width: 1.5, color: outline });
      if (stage.hasAttribute("data-campus-markers-exiting")) return;
      const columnWidth = Math.min(width / 3, 140);
      const centerX = width / 2;
      const [northRow, [west, south, east]] = campusRows;
      const overviewMatrix = cameraMatrix(overviewEye, overview.point, width / Math.max(1, height), 0);
      const [southX, southY] = projectPoint(south.building.point, overviewMatrix, width, height, 0);
      const [eastX, eastY] = projectPoint(east.building.point, overviewMatrix, width, height, 0);
      const lowerRowY = height * .615;
      const westLabelY = lowerRowY + 12;
      const labelWidth = Math.min(128, width / 3 - 12);
      const eastLabelLeft = eastX + 10;
      const eastLabelWidth = Math.max(1, Math.min(labelWidth, width - eastLabelLeft - 6));
      const southLabelWidth = Math.min(80, labelWidth);
      const southLabelX = Math.max(southX + 18, centerX + (labelWidth + southLabelWidth) / 2 + 4);
      const overlapsEast = southLabelX + southLabelWidth / 2 + 4 > eastLabelLeft &&
        southLabelX - southLabelWidth / 2 - 4 < eastLabelLeft + eastLabelWidth;
      const southLabelY = Math.max(
        southY + 20,
        southX + 7 - centerX < labelWidth ? lowerRowY + 18 : 0,
        overlapsEast ? eastY + 35 : 0,
      );
      const northLabelY = height * .395;
      const outerLabelY = northLabelY + Math.min(height * .045, 24);
      const slots = [
        ...northRow.map((entry, column) => [
          entry,
          [centerX + (column - 1) * columnWidth, column === 1 ? northLabelY : outerLabelY],
        ]),
        [west, [centerX, westLabelY]],
        [south, [southLabelX, southLabelY, southLabelWidth]],
        [east, [eastLabelLeft + eastLabelWidth / 2, eastY + 10, eastLabelWidth]],
      ];
      for (const [{ building, index }, slot] of slots) {
        mark(project, building.point, building.name, "building", width, height, occupied, {
          active: index === highlightedBuilding,
          slot,
        });
      }
    } else if (chapter === 2) {
      mark(project, data.buildings[0].point, translate("Polivalente building", "Edificio Polivalente"), "building", width, height, occupied, { labelOffsetX: -24 });
    } else if (chapter === 3) {
      mark(project, data.antennas[0].point, translate("Lab · Module 7", "Laboratorio · Módulo 7"), "building", width, height, occupied, { labelOffsetX: -24 });
    } else {
      if (chapter === 4) {
        const styles = { FR1: { dash: [7, 4], color: accent }, FR2: { dash: [2, 4], color: ink } };
        for (const [band, polygons] of Object.entries(data.coverage || {})) {
          for (const polygon of polygons) {
            for (const ring of polygon.rings) line(ring, project, styles[band]);
          }
        }
      }
      network(project, width, height, occupied);
    }
  }

  function plan(width, height, chapter, highlightedBuilding, subject, zoom) {
    const bounds = data.campusOutline.reduce((box, p) => [
      Math.min(box[0], p[0]), Math.min(box[1], p[2]), Math.max(box[2], p[0]), Math.max(box[3], p[2]),
    ], [Infinity, Infinity, -Infinity, -Infinity]);
    const scale = Math.min(Math.max(0, width - 55) / (bounds[2] - bounds[0]),
      Math.max(0, height - 85) / (bounds[3] - bounds[1])) * zoom;
    const project = point => [(point[0] - subject[0]) * scale + width / 2,
      (point[2] - subject[2]) * scale + height / 2];
    if (chapter !== 1) line(data.campusOutline, project, { dash: [5, 5], width: 1.4, color: outline });
    draw(project, width, height, chapter, highlightedBuilding);
    return project;
  }
  function buildingLabelRight(point) {
    const label = nodes.get("building:" + point.join(","))?.label;
    if (!label?.style.left) return null;
    return parseFloat(label.style.left) + label.offsetWidth / 2;
  }

  return { begin, draw, plan, end, buildingLabelRight };
}

function validateModel(model, baseURL) {
  if (!Array.isArray(model?.origin) || model.origin.length !== data.origin.length ||
      model.origin.some((value, i) => data.origin[i] !== value) || !Array.isArray(model.chunks)) {
    throw new Error("Invalid campus model");
  }
  return { ...model, baseURL };
}

async function findModel(href) {
  if (!href) return null;
  const url = new URL(href, location.href);
  const response = await fetchModelAsset(url, location.href, "high");
  return validateModel(await response.json(), url);
}

function boot(root) {
  const part = name => root.querySelector(`[data-campus-part="${name}"]`);
  const canvas = part("model");
  const overlay = part("annotation-lines");
  const stage = part("stage");
  const stages = [...root.querySelectorAll("[data-campus-chapter]")];
  const a11yMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const scenes = makeScenes(data);
  const translate = (en, es) => document.documentElement.lang === "es" ? es : en;
  const layer = makeAnnotationLayer(data, overlay, part("map-labels"), stage, translate, scenes[1], invalidate);
  const loadPanel = part("map-loader");
  const status = part("map-status");
  const loadPercent = part("map-load-percent");
  const loadProgress = part("map-load-progress");
  const credit = part("map-credit");
  const photoToggle = part("photo-toggle");
  const map = part("map");
  const gallery = part("gallery");
  let renderer = null, loader = null, selected = null;
  let hoveredBuilding = null;
  let photoMode = false, loading = false, modelCredit = "", activeModel = false;
  let queued = false, camera = null;

  function positionGallery(project, width, height, progress, chapter) {
    const marker = project(data.antennas[0].point);
    const amount = a11yMotion.matches
      ? Number(chapter === 3)
      : clamp((.66 - Math.abs(progress - 3)) / .3, 0, 1);
    if (!marker || amount <= 0.03) {
      gallery.hidden = true;
      gallery.inert = true;
      return;
    }

    const [x, y] = marker;
    const labelPoint = chapter === 2 ? data.buildings[0].point : data.antennas[0].point;
    const labelRight = layer.buildingLabelRight(labelPoint);
    const edge = 10;
    const clearance = 12;
    const rightStart = Math.max(x, labelRight ?? x) + clearance;
    const availableWidth = width - rightStart - edge;
    const reveal = amount * clamp((availableWidth - 80) / 30, 0, 1);
    gallery.hidden = reveal <= 0.03;
    gallery.inert = gallery.hidden || chapter !== 3;
    if (gallery.hidden) return;
    gallery.style.setProperty("--gallery-max-width", availableWidth + "px");

    const cardWidth = gallery.offsetWidth;
    const cardHeight = gallery.offsetHeight;
    const gap = Math.min(72, width * .15);
    const left = clamp(x + gap, rightStart, width - cardWidth - edge);
    const top = clamp(y - cardHeight * .35, 45, height - cardHeight - 40);
    const travel = Math.min(24, width - cardWidth - edge - left);
    gallery.style.setProperty("--gallery-x", left + "px");
    gallery.style.setProperty("--gallery-y", top + "px");
    gallery.style.setProperty("--gallery-reveal", String(reveal));
    gallery.style.setProperty("--gallery-offset", (1 - reveal) * travel + "px");
  }

  function updateCredit() {
    const name = activeModel
      ? (modelCredit || translate("Georeferenced model", "Modelo georreferenciado")) +
        (loader?.failed ? translate(" · Partial load", " · Carga parcial") : "")
      : translate("Campus plan", "Plano del campus");
    if (credit.textContent !== name) credit.textContent = name;
  }

  function finishLoading() {
    loading = false;
    const reveal = renderer && !a11yMotion.matches;
    stage.dataset.modelState = reveal ? "revealing" : "ready";
    loadPanel.setAttribute("data-state", "ready");
    loadPanel.setAttribute("aria-hidden", "true");
    canvas.setAttribute("aria-busy", "false");
    if (!reveal) invalidate();
  }

  function finishReveal() {
    if (stage.dataset.modelState !== "revealing") return;
    stage.dataset.modelState = "ready";
    invalidate();
  }

  function showPlan(message) {
    loader?.stop();
    loading = false;
    stage.dataset.modelState = "plan";
    status.textContent = message;
    status.hidden = false;
    loadPanel.setAttribute("data-state", "unavailable");
    loadPanel.removeAttribute("aria-hidden");
    canvas.setAttribute("aria-busy", "false");
    activeModel = false;
    updateCredit();
    photoToggle.hidden = true;
  }

  function showLoadingProgress() {
    if (!loading) return;
    const { done, total, meshesReady, terrainAvailable } = loader.visibleProgress();
    const percent = total ? Math.floor(100 * done / total) : 100;
    if (!loadProgress.hasAttribute("value") || loadProgress.value !== percent) {
      loadProgress.value = percent;
      loadPercent.textContent = percent + "%";
    }
    if (done < total) {
      const phase = meshesReady
        ? translate("Loading aerial imagery…", "Cargando la fotografía aérea…")
        : translate("Loading campus terrain…", "Cargando el terreno del campus…");
      if (status.textContent !== phase) status.textContent = phase;
      return;
    }
    if (!terrainAvailable) {
      renderer = null;
      showPlan(translate("The 3D model could not load. The campus plan is shown instead.", "No se pudo cargar el modelo 3D. Se muestra el plano del campus."));
      return;
    }
    photoToggle.hidden = !loader.photoCount;
    finishLoading();
  }
  function invalidate() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  }
  const getProgress = bindScroll(root, stages, invalidate);
  const buildingButtons = [...root.querySelectorAll("[data-building]")];
  buildingButtons.forEach((button, index) => {
    button.disabled = false;
    button.addEventListener("pointerenter", event => {
      if (event.pointerType === "touch") return;
      hoveredBuilding = index;
      invalidate();
    });
    button.addEventListener("pointerleave", () => {
      if (hoveredBuilding !== index) return;
      hoveredBuilding = null;
      invalidate();
    });
    button.addEventListener("focus", invalidate);
    button.addEventListener("blur", invalidate);
    button.addEventListener("click", () => {
      selected = selected === index ? null : index;
      buildingButtons.forEach((item, i) => item.setAttribute("aria-pressed", String(i === selected)));
      if (selected !== null && stage.dataset.chapter !== "1") {
        stages[1].scrollIntoView({ block: "start", behavior: a11yMotion.matches ? "instant" : "smooth" });
      }
      invalidate();
    });
  });
  photoToggle.addEventListener("click", () => {
    photoMode = !photoMode;
    photoToggle.setAttribute("aria-pressed", String(photoMode));
    invalidate();
  });

  function frame() {
    queued = false;
    const { i, t, chapter } = getProgress();
    if (!stage.offsetWidth) return;
    const campusExitPoint = a11yMotion.matches ? .5 : .32;
    stage.toggleAttribute("data-campus-markers-exiting", i >= 2 || (i === 1 && t >= campusExitPoint));
    const focusedBuilding = buildingButtons.indexOf(document.activeElement);
    const highlightedBuilding = hoveredBuilding ?? (focusedBuilding >= 0 ? focusedBuilding : selected);
    const introMove = i === 0;
    const sceneProgress = introMove ? t * (2 - t) : t * t * (3 - 2 * t);
    const smooth = a11yMotion.matches ? Number(t >= .5) : sceneProgress;
    const from = scenes[i], to = scenes[Math.min(i + 1, scenes.length - 1)];
    const target = {
      point: from.point.map((value, dim) => blend(value, to.point[dim], smooth)),
      range: blend(from.range, to.range, smooth),
      height: blend(from.height, to.height, smooth),
      angle: blend(from.angle, to.angle, smooth),
    };
    const zoomedBuilding = chapter === 1 && selected !== null ? data.buildings[selected] : null;
    const overview = scenes[1];
    const goal = zoomedBuilding
      ? [...zoomedBuilding.point, overview.range * .62, overview.height * .62, overview.angle]
      : [...target.point, target.range, target.height, target.angle];
    const followIntro = introMove && chapter === 0 && camera && Math.abs(camera[3] - target.range) < .02;
    const easing = a11yMotion.matches || followIntro || !camera ? 1 : .22;
    camera = camera ? camera.map((value, index) => blend(value, goal[index], easing)) : goal;
    const cameraMoving = goal.some((value, j) => Math.abs(value - camera[j]) > .02);
    const [px, py, pz, range, height, angle] = camera;
    const subject = [px, py, pz];
    const eye = [px + Math.sin(angle) * range, py + height, pz + Math.cos(angle) * range];
    const width = canvas.clientWidth, viewHeight = canvas.clientHeight;
    const focusWidth = overlay.clientWidth;
    const focusInset = width - focusWidth;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const overlayWidth = Math.max(1, Math.round(focusWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(viewHeight * dpr));
    for (const [element, elementWidth] of [[canvas, pixelWidth], [overlay, overlayWidth]]) {
      if (element.width !== elementWidth || element.height !== pixelHeight) {
        element.width = elementWidth;
        element.height = pixelHeight;
      }
    }
    if (stage.dataset.chapter !== String(chapter)) stage.dataset.chapter = String(chapter);
    layer.begin(dpr);
    let project;
    if (renderer) {
      const matrix = cameraMatrix(eye, subject, width / Math.max(1, viewHeight), focusInset / Math.max(1, width));
      const planes = viewPlanes(matrix);
      if (stage.dataset.modelState !== "revealing") {
        loader.request(matrix, planes, subject, photoMode, loading, pixelWidth, pixelHeight);
      }
      renderer.render(pixelWidth, pixelHeight, matrix, planes, loader.available, photoMode);
      if (loader.available.length) {
        project = point => projectPoint(point, matrix, width, viewHeight, focusInset);
        layer.draw(project, focusWidth, viewHeight, chapter, highlightedBuilding);
      }
      showLoadingProgress();
      updateCredit();
    }
    if (!project || !renderer) {
      if (project) layer.begin(dpr);
      const zoom = clamp(data.viewRadiusM * .94 / range, 1, 2.65);
      project = layer.plan(focusWidth, viewHeight, chapter, highlightedBuilding, subject, zoom);
    }
    positionGallery(project, focusWidth, viewHeight, loading ? 0 : i + t, loading ? 0 : chapter);
    layer.end();
    if (cameraMoving) invalidate();
  }

  function startLoading() {
    loading = true;
    stage.dataset.modelState = "loading";
    loadPanel.setAttribute("data-state", "preparing");
    loadPanel.removeAttribute("aria-hidden");
    status.hidden = false;
    status.textContent = translate("Preparing the 3D viewer…", "Preparando el visor 3D…");
    canvas.setAttribute("aria-busy", "true");
  }

  function showModel(model) {
    if (!model) { finishLoading(); return; }
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: true });
    if (!gl) throw new Error("WebGL 2 is unavailable");
    renderer = makeRenderer(gl, data, stage);
    const chunks = model.chunks.filter(chunk => distanceToBounds(chunk.bounds, data.campusCenter) <= data.viewRadiusM);
    photoMode = Boolean(model.photographs);
    loader = makeLoader(chunks, renderer, model.baseURL, data.campusCenter, photoMode, invalidate);
    photoToggle.setAttribute("aria-pressed", String(photoMode));
    activeModel = true;
    modelCredit = model.credit;
    loadPanel.setAttribute("data-state", "loading");
    updateCredit();
  }

  function handleModelError(error) {
    console.error(error);
    renderer = null;
    showPlan(translate("3D is unavailable. The campus plan is shown instead.", "La vista 3D no está disponible. Se muestra el plano del campus."));
  }

  canvas.addEventListener("animationend", finishReveal);
  canvas.addEventListener("animationcancel", finishReveal);
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    renderer = null;
    showPlan(translate("3D is unavailable. Reload the page to try again.", "La vista 3D no está disponible. Recarga la página para intentarlo de nuevo."));
    invalidate();
  });
  window.addEventListener("language-change", () => { updateCredit(); invalidate(); });
  new MutationObserver(invalidate).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  a11yMotion.addEventListener("change", () => {
    if (a11yMotion.matches) finishReveal();
    invalidate();
  });
  map.hidden = false;
  updateCredit();
  invalidate();

  if (root.dataset.modelUrl) {
    startLoading();
    findModel(root.dataset.modelUrl).then(showModel).catch(handleModelError).finally(invalidate);
  }
}

document.querySelectorAll("[data-campus-viewer]").forEach(boot);
