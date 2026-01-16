---
title: "Connecting a Camera to Raspberry Pi"
title_es: "Conexión de Cámara a Raspberry Pi"
summary: "Comprehensive guide for setting up and configuring the Raspberry Pi Camera Module. This project explores video capture techniques using FFMPEG and raspivid, and details the implementation of a low-latency web streaming server for remote monitoring applications."
summary_es: "Guía completa para la instalación y configuración del Módulo de Cámara de Raspberry Pi. Este proyecto explora técnicas de captura de video utilizando FFMPEG y raspivid, y detalla la implementación de un servidor de streaming web de baja latencia para aplicaciones de monitorización remota."
tags: ["Raspberry Pi", "Camera", "FFMPEG", "Streaming", "Python"]
tags_es: ["Raspberry Pi", "Cámara", "FFMPEG", "Streaming", "Python"]
date: 2024-03-01
docUrl: ""
codeUrl: ""
team: ["estudiante-jairo-tunon-diaz"]
---

## Connecting the Camera Module

In this case, we will use the model: **Raspberry Pi Camera Board v2 (8 Mp)**.

This 8 Mp camera module is capable of capturing 1080px video and images, and can be connected to all Raspberry Pi models. It is ready to plug and play, making it very suitable for time-lapse photography, video recording, or for security and motion detection applications. You simply need to connect the included cable to the Raspberry Pi's CSI port.

The module is small, measuring **25mm x 23mm x 9mm** and weighing 3g, making it perfect for mobile applications or others where weight is a very important factor.

The sensor has a resolution of 8 megapixels and features a fixed focus lens. Regarding images, the camera is capable of taking static images up to **3280 x 2464 pixels** and 1080p30 videos.

All current Raspberry Pi models feature a port for connecting the camera module.

<br />

## Physical Installation

Ensure your Raspberry Pi is powered off.

**Steps to follow:**

1.  Locate the camera module port.
2.  Gently pull up on the edges of the plastic clip of the port.
3.  Insert the camera module ribbon cable.
    *(Note: ensure the cable is facing the correct direction. The blue side of the cable should face towards the Ethernet port and USB ports)*.
4.  Push the plastic clip back into place.

We can check if the camera has been recognized by the Raspberry Pi with the command:

```bash
vcgencmd get_camera
```

<br />

## Configuration Using FFMPEG

Video capture from the RPi camera with `ffmpeg` can vary from less than 5% to 100% CPU usage (RPi Zero) depending on whether `ffmpeg` uses hardware acceleration or not.

**Capture video:**

```bash
ffmpeg -f video4linux2 -input_format h264 -video_size 1280x720 -framerate 30 -i /dev/video0 -vcodec copy -an test.h264
```

**Capture an image:**

```bash
ffmpeg -f video4linux2 -input_format mjpeg -video_size 1280x720 -i /dev/video0 -vframes 1 -f mjpeg -
```

<br />

## Configuration via VNC

**Steps to follow:**

1.  Turn on your Raspberry Pi.
2.  Log in via VNC from your computer to your Raspberry Pi.
3.  Go to the main menu and open **Raspberry Pi Configuration**.

NOTE: You can also use the command line:

```bash
sudo raspi-config
```

4.  Select the **Interfaces** tab and ensure the camera is **enabled**.
5.  Restart your Raspberry Pi.

Once restarted, we will proceed to make some changes in VNC within the Raspberry Pi desktop. When executing some preview commands, VNC will not be able to show the camera feed unless we make these changes.

**VNC Configuration (Desktop):**

1.  First, go to the VNC icon and click on it.
2.  In the **Options** menu, go to the **Troubleshooting** tab.
3.  Click on the checkbox **Enable direct capture mode** and then click **Apply**.

This will allow us to see the preview of what our camera module is capturing. The screen will go black for a few seconds, and when the image returns, it will be ready. It is not necessary, but you can restart the Raspberry Pi to start with the next step.

<br />

## Using raspistill (Image Capture)

`raspistill` is a command-line tool for capturing images from the camera.

To verify that the camera is installed correctly and to use the camera only as a viewfinder, without saving a photo, verify by entering this command in the terminal:

```bash
raspistill -t 0
```

This will likely give a blurry image on the HQ module, but for the V2 module, it should not have major issues.

**Capture Image:**

Now you should see a clear image and can take a test photo by entering the command:

```bash
raspistill -o test.jpg
```

When you press ENTER, a live preview image will appear, and after a default period of five seconds, the camera will capture a single still image. This will be saved in your home folder and named `test.jpg`.

<br />

## Video Capture with raspivid

To record videos, `raspivid` is what you need. Test it with this Terminal command:

```bash
raspivid -t 10000 -o testvideo.h264
```

*   `-t 10000` is the time it will be recording video; 10000 milliseconds means 10 seconds of recording.
*   `.h264` is the video format to play in VLC, a player included in Raspberry Pi OS.

In case you want to change the format to MP4, which is a more common and edit-friendly format, commands for this can be found online.

<br />

## Camera Web Server

To launch the program, the `aiortc` and `aiohttp` libraries need to be installed primarily. This can be done via `pip` (remember to use `sudo`):

```bash
sudo pip install aiortc
sudo pip install aiohttp
```

Once requirements are met and the project is downloaded, go to the main folder (`webcam_robot`). Here the code can be executed using the command:

```bash
python3 webcam.py
```

Arguments can also be added to modify the default streaming configuration. For example:

```bash
python webcam.py --video-codec=video/H264 --resolution "320x240"
```

**Relevant arguments:**

*   `--resolution`: changes the camera resolution (e.g. `640x480`).
*   `--framerate`: to change the streaming frames per second (e.g. `30`). Linux automatically selects the camera interface.
*   `--video-codec`: to change the video codec used. In my experience, most browsers only support `VP8` and `H264` (use `video/VP8` or `video/H264`).

Once the program is launched, if everything went well, we can connect to the webpage with a browser using the computer's IP with port 8080 (e.g. `http://192.168.0.244:8080/`). Press the button that appears in the middle of the screen to start the video stream, and after a few seconds, the live feed appears.

### Attention

*   **Firefox** has issues with this implementation, possibly because we are not using HTTPS, so it must be opened in another browser (Chrome or Edge work).
*    above a certain resolution (HD), the video looks very bad (**H264**): it is a matter of how the codec is implemented in the `aiortc` library.
    If you look at the file `\src\aiortc\codecs\h264.py`, you can see that the bitrate is limited, so all margins must be increased if one wants to transmit with good quality and frame rate.
*   Above a certain resolution (HD), the stream uses a lot of bandwidth (**VP8**). If you look at the file `\src\aiortc\codecs\vpx.py`, you can see that the bitrate is limited, so margins must be adjusted.
