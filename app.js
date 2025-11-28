// Global variables
let player;
let isVideoLoaded = false;
let isCroppedMode = false;

// DOM Elements
const videoUrlInput = document.getElementById('videoUrl');
const loadBtn = document.getElementById('loadBtn');
const cropControls = document.getElementById('cropControls');
const toggleCropBtn = document.getElementById('toggleCropBtn');
const resetBtn = document.getElementById('resetBtn');
const aspectRatioSelect = document.getElementById('aspectRatio');
const videoContainer = document.getElementById('videoContainer');
const cropOverlay = document.getElementById('cropOverlay');
const cropBox = document.getElementById('cropBox');

// Load YouTube IFrame API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
    console.log("YouTube API Ready");
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadVideo() {
    const url = videoUrlInput.value;
    const videoId = extractVideoId(url);

    if (!videoId) {
        alert("URL inválida do YouTube");
        return;
    }

    if (player) {
        player.loadVideoById(videoId);
    } else {
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady
            }
        });
    }
}

function onPlayerReady(event) {
    isVideoLoaded = true;
    cropControls.style.display = 'flex';
    cropOverlay.style.display = 'block';
    resetCropBox();
}

// Crop Box Logic
let isDragging = false;
let isResizing = false;
let currentHandle = null;
let startX, startY, startLeft, startTop, startWidth, startHeight;

function initCropInteractions() {
    cropBox.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopInteraction);

    const handles = document.querySelectorAll('.handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => startResize(e, handle));
    });
}

function startDrag(e) {
    if (e.target.classList.contains('handle')) return; // Let resize handle it
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = cropBox.getBoundingClientRect();
    const parentRect = cropOverlay.getBoundingClientRect();

    startLeft = rect.left - parentRect.left;
    startTop = rect.top - parentRect.top;
}

function startResize(e, handle) {
    e.stopPropagation();
    isResizing = true;
    currentHandle = handle;
    startX = e.clientX;
    startY = e.clientY;

    const rect = cropBox.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;

    const parentRect = cropOverlay.getBoundingClientRect();
    startLeft = rect.left - parentRect.left;
    startTop = rect.top - parentRect.top;
}

function handleMouseMove(e) {
    if (!isDragging && !isResizing) return;

    const parentRect = cropOverlay.getBoundingClientRect();

    if (isDragging) {
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        // Bounds check
        const boxRect = cropBox.getBoundingClientRect();
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft + boxRect.width > parentRect.width) newLeft = parentRect.width - boxRect.width;
        if (newTop + boxRect.height > parentRect.height) newTop = parentRect.height - boxRect.height;

        cropBox.style.left = newLeft + 'px';
        cropBox.style.top = newTop + 'px';
    } else if (isResizing) {
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        if (currentHandle.classList.contains('se')) {
            newWidth = startWidth + dx;
            newHeight = startHeight + dy;
        } else if (currentHandle.classList.contains('sw')) {
            newWidth = startWidth - dx;
            newHeight = startHeight + dy;
            newLeft = startLeft + dx;
        } else if (currentHandle.classList.contains('ne')) {
            newWidth = startWidth + dx;
            newHeight = startHeight - dy;
            newTop = startTop + dy;
        } else if (currentHandle.classList.contains('nw')) {
            newWidth = startWidth - dx;
            newHeight = startHeight - dy;
            newLeft = startLeft + dx;
            newTop = startTop + dy;
        }

        // Min size check
        if (newWidth < 50) newWidth = 50;
        if (newHeight < 50) newHeight = 50;

        // Aspect Ratio Lock (if not free)
        const ratio = aspectRatioSelect.value;
        if (ratio !== 'free') {
            const [w, h] = ratio.split(':').map(Number);
            const targetRatio = w / h;

            // Simple logic: adjust height based on width for now
            newHeight = newWidth / targetRatio;
        }

        cropBox.style.width = newWidth + 'px';
        cropBox.style.height = newHeight + 'px';
        cropBox.style.left = newLeft + 'px';
        cropBox.style.top = newTop + 'px';
    }
}

function stopInteraction() {
    isDragging = false;
    isResizing = false;
    currentHandle = null;
}

function resetCropBox() {
    cropBox.style.top = '10%';
    cropBox.style.left = '25%';
    cropBox.style.width = '50%';
    cropBox.style.height = '80%';
}

function toggleCropView() {
    if (!isVideoLoaded) return;

    isCroppedMode = !isCroppedMode;

    if (isCroppedMode) {
        applyCrop();
        toggleCropBtn.textContent = "Editar Recorte";
        cropControls.classList.add('active-crop');
    } else {
        removeCrop();
        toggleCropBtn.textContent = "Visualizar Recorte";
        cropControls.classList.remove('active-crop');
    }
}

function applyCrop() {
    const parentRect = videoContainer.getBoundingClientRect();
    const boxRect = cropBox.getBoundingClientRect();

    // Calculate percentages relative to the container
    const relativeLeft = (boxRect.left - parentRect.left) / parentRect.width;
    const relativeTop = (boxRect.top - parentRect.top) / parentRect.height;
    const relativeWidth = boxRect.width / parentRect.width;
    const relativeHeight = boxRect.height / parentRect.height;

    const scaleX = 1 / relativeWidth;
    const scaleY = 1 / relativeHeight;

    const playerEl = document.getElementById('player');

    // Logic: Move the crop start to (0,0) then scale up
    // transform-origin: 0 0
    // transform: scale(S) translate(-L, -T)

    playerEl.style.transformOrigin = '0 0';
    playerEl.style.transform = `scale(${scaleX}, ${scaleY}) translate(-${relativeLeft * 100}%, -${relativeTop * 100}%)`;

    videoContainer.classList.add('is-cropped');
}

function removeCrop() {
    const playerEl = document.getElementById('player');
    playerEl.style.transform = 'none';
    videoContainer.classList.remove('is-cropped');
}

// Event Listeners
loadBtn.addEventListener('click', loadVideo);
toggleCropBtn.addEventListener('click', toggleCropView);
resetBtn.addEventListener('click', () => {
    removeCrop();
    resetCropBox();
    isCroppedMode = false;
    toggleCropBtn.textContent = "Visualizar Recorte";
});

// Recording Logic
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let canvasStream;
let captureStream;

const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const recordingStatus = document.getElementById('recordingStatus');

async function startRecording() {
    try {
        // 1. Capture the screen/tab
        captureStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: "browser", // Prefer browser tab
            },
            audio: true,
            preferCurrentTab: true // Experimental flag
        });

        // 2. Setup Canvas for processing (cropping)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Get the video track from capture
        const videoTrack = captureStream.getVideoTracks()[0];
        const { width, height } = videoTrack.getSettings();

        // We need to determine the crop area relative to the CAPTURED stream.
        // This is tricky because the captured stream is the WHOLE tab (or screen).
        // We need to map the cropBox coordinates (DOM) to the video frame coordinates.
        // Assumption: The user captures the TAB.

        // For simplicity in this version: We will record the WHOLE tab but crop it in the canvas loop?
        // Actually, mapping DOM coordinates to the stream video frame is hard because of scrolling, zooming, high-DPI, etc.

        // ALTERNATIVE: Since we are ALREADY zooming in the player using CSS Transform, 
        // the "visual" result on screen IS the cropped video (mostly).
        // BUT `getDisplayMedia` captures the raw tab, not just the viewport? 
        // No, it captures what is visible.
        // If we are in "Cropped Mode", the video is zoomed in to fill the container.
        // If we record the TAB, we record the whole UI too (buttons, etc).

        // BETTER APPROACH for "Clean" export:
        // We can't easily get a clean stream of just the cropped video without the UI.
        // UNLESS we make a "Clean Mode" where we hide everything else?

        // Let's try to crop the stream based on the video element's position.
        // We will draw the captured frame into the canvas, but only the part that corresponds to the video player.

        // Let's set canvas size to the desired output size (e.g. 1920x1080 or the crop ratio)
        // For now, let's match the crop aspect ratio.

        const rect = cropBox.getBoundingClientRect();
        canvas.width = rect.width; // This is screen pixels. Might be low res.
        canvas.height = rect.height;

        // To get high res, we should probably use the video resolution?
        // But we don't have access to the raw video pixels due to CORS (tainted canvas).
        // So we MUST use the Screen Capture stream.

        // Let's just record the stream as is for now, but maybe crop it?
        // Cropping a DisplayMedia stream in canvas is possible.
        // We need to find WHERE the video is in the stream.
        // If the user shares the TAB, the top-left of the stream is the top-left of the viewport.

        const drawLoop = () => {
            if (!isRecording) return;

            // Draw the captured frame to canvas
            // We want to draw only the part of the screen that is inside the cropBox?
            // Wait, if we are in "Visualizar Recorte" mode, the video is ALREADY filling the container (zoomed).
            // So the "Crop Box" is effectively the whole videoContainer?
            // Yes! In `applyCrop`, we scale the video so the crop area fills the `videoContainer`.

            // So, if the user is in "Cropped Mode", we just need to record the `videoContainer` area of the screen.
            const containerRect = videoContainer.getBoundingClientRect();

            // We need to account for the browser UI (address bar, etc) if capturing "Window"?
            // If capturing "Tab", usually (0,0) is the top of the page content.

            // Let's assume (0,0) of stream is (0,0) of document (viewport).
            // ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

            // Source X/Y = containerRect.left / top (relative to viewport)
            // Source W/H = containerRect.width / height

            // Note: devicePixelRatio matters!
            const dpr = window.devicePixelRatio || 1;

            // The stream usually has the resolution of the screen * dpr.
            // So we need to scale coordinates.

            // Create a temporary video element to play the stream so we can draw it
            // (We can't draw the track directly, need a video element source)
            // Actually `captureStream` needs to be attached to a hidden video element to be drawn.
        };

        // Helper to play stream for canvas
        const hiddenVideo = document.createElement('video');
        hiddenVideo.srcObject = captureStream;
        hiddenVideo.muted = true;
        hiddenVideo.play();

        await new Promise(r => hiddenVideo.onloadedmetadata = r);

        // Update canvas size to match the container's aspect ratio but higher res?
        // Let's use the container's screen size * dpr for quality.
        const containerRect = videoContainer.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = containerRect.width * dpr;
        canvas.height = containerRect.height * dpr;

        const loop = () => {
            if (!isRecording) return;

            // Draw from the hidden video (screen capture)
            // We crop the area corresponding to the videoContainer

            // Source coordinates (in the stream video)
            // If the stream matches the viewport size * dpr:
            const sx = (containerRect.left + window.scrollX) * dpr;
            const sy = (containerRect.top + window.scrollY) * dpr;
            const sWidth = containerRect.width * dpr;
            const sHeight = containerRect.height * dpr;

            ctx.drawImage(hiddenVideo, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

            requestAnimationFrame(loop);
        };

        // Start Loop
        isRecording = true;
        loop();

        // 3. Start MediaRecorder on the CANVAS stream
        canvasStream = canvas.captureStream(30); // 30 FPS

        // Merge audio from captureStream if available
        if (captureStream.getAudioTracks().length > 0) {
            canvasStream.addTrack(captureStream.getAudioTracks()[0]);
        }

        mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = saveFile;

        mediaRecorder.start();

        // UI Updates
        startRecordBtn.style.display = 'none';
        stopRecordBtn.style.display = 'block';
        recordingStatus.style.display = 'flex';

        // Stop listener for the stream (if user clicks "Stop Sharing" in browser UI)
        captureStream.getVideoTracks()[0].onended = stopRecording;

    } catch (err) {
        console.error("Error starting recording:", err);
        alert("Erro ao iniciar gravação: " + err.message);
    }
}

function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    mediaRecorder.stop();

    // Stop all tracks
    captureStream.getTracks().forEach(track => track.stop());

    // UI Updates
    startRecordBtn.style.display = 'block';
    stopRecordBtn.style.display = 'none';
    recordingStatus.style.display = 'none';
}

function saveFile() {
    const blob = new Blob(recordedChunks, {
        type: 'video/webm'
    });
    recordedChunks = [];

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recorte-youtube.webm';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

startRecordBtn.addEventListener('click', startRecording);
stopRecordBtn.addEventListener('click', stopRecording);

// Add CSS for the recording dot
const style = document.createElement('style');
style.textContent = `
    .dot {
        width: 10px;
        height: 10px;
        background-color: #ef4444;
        border-radius: 50%;
        display: inline-block;
        animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style);

