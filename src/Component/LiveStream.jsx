import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import imageCompression from "browser-image-compression";

function LiveStream() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [overlays, setOverlays] = useState([]);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newOverlay, setNewOverlay] = useState({
    type: "",
    content: "",
    position: { x: 50, y: 50 },
    size: 100,
  });
  const [editingOverlay, setEditingOverlay] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [previewPosition, setPreviewPosition] = useState({ x: 50, y: 50 });
  const videoRef = useRef(null);
  const { videoUrl } = useParams();
  const fileInputRef = useRef(null);
  const dragItemRef = useRef(null);
  const dragOverlayRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
    }
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateTime);

    video
      .play()
      .catch((error) => console.log("Auto-play was prevented:", error));
    setIsPlaying(true);

    video.addEventListener("waiting", () => {
      console.log("Video is buffering");
    });

    video.addEventListener("canplay", () => {
      console.log("Video can play");
    });

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateTime);
      video.removeEventListener("waiting", () => {});
      video.removeEventListener("canplay", () => {});
    };
  }, []);

  useEffect(() => {
    fetchOverlays();
  }, [videoUrl]);

  const fetchOverlays = async () => {
    try {
      const response = await fetch(
        `https://service-portal-backend.vercel.app/api/overlays?videoUrl=${encodeURIComponent(
          videoUrl
        )}`
      );
      const data = await response.json();
      setOverlays(data);
    } catch (error) {
      console.error("Error fetching overlays:", error);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handlePlaybackRateChange = (e) => {
    const newRate = parseFloat(e.target.value);
    setPlaybackRate(newRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
  };

  const addTextOverlay = async () => {
    if (newOverlay.content) {
      try {
        const response = await fetch("https://service-portal-backend.vercel.app/api/overlays", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...newOverlay,
            type: "text",
            videoUrl: videoUrl,
          }),
        });
        const data = await response.json();
        setOverlays([...overlays, data]);
        setNewOverlay({
          type: "",
          content: "",
          position: { x: 50, y: 50 },
          size: 100,
        });
        setIsTextModalOpen(false);
      } catch (error) {
        console.error("Error adding text overlay:", error);
      }
    }
  };

  const addLogoOverlay = async () => {
    if (newOverlay.content) {
      try {
        const response = await fetch("https://service-portal-backend.vercel.app/api/overlays", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...newOverlay,
            type: "logo",
            videoUrl: videoUrl,
          }),
        });
        const data = await response.json();
        setOverlays([...overlays, data]);
        setNewOverlay({
          type: "",
          content: "",
          position: { x: 50, y: 50 },
          size: 100,
        });
        setIsLogoModalOpen(false);
      } catch (error) {
        console.error("Error adding logo overlay:", error);
      }
    }
  };

  const deleteOverlay = async (id) => {
    try {
      await fetch(`https://service-portal-backend.vercel.app/api/overlays/${id}`, {
        method: "DELETE",
      });
      setOverlays(overlays.filter((overlay) => overlay._id !== id));
    } catch (error) {
      console.error("Error deleting overlay:", error);
    }
  };

  const editOverlay = (overlay) => {
    setEditingOverlay(overlay);
    setPreviewPosition(overlay.position);
    setIsEditModalOpen(true);
  };

  const updateOverlay = async () => {
    try {
      const response = await fetch(
        `https://service-portal-backend.vercel.app/api/overlays/${editingOverlay._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editingOverlay),
        }
      );
      const updatedOverlay = await response.json();

      // Update overlays in the frontend to reflect the change
      setOverlays(
        overlays.map((overlay) =>
          overlay._id === updatedOverlay._id ? updatedOverlay : overlay
        )
      );
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating overlay:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const options = {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onload = (e) => {
          setNewOverlay({
            ...newOverlay,
            content: e.target.result,
            type: "logo",
          });
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const handlePositionChange = (direction) => {
    const step = 5;
    let newX = editingOverlay.position.x;
    let newY = editingOverlay.position.y;

    switch (direction) {
      case "left":
        newX = Math.max(0, newX - step);
        break;
      case "right":
        newX = Math.min(100, newX + step);
        break;
      case "up":
        newY = Math.max(0, newY - step);
        break;
      case "down":
        newY = Math.min(100, newY + step);
        break;
      default:
        break;
    }

    setEditingOverlay({
      ...editingOverlay,
      position: { x: newX, y: newY },
    });
  };

  const handleSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setEditingOverlay({
      ...editingOverlay,
      size: newSize,
    });
  };

  const handleDragStart = (e, overlay) => {
    dragItemRef.current = overlay;
    dragOverlayRef.current = e.target;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.parentNode);
    e.dataTransfer.setDragImage(e.target.parentNode, 20, 20);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    return false;
  };

  const handleDrag = (e) => {
    if (!dragItemRef.current) return;

    const videoRect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - videoRect.left) / videoRect.width) * 100;
    const y = ((e.clientY - videoRect.top) / videoRect.height) * 100;

    const restrictedX = Math.max(0, Math.min(100, x));
    const restrictedY = Math.max(0, Math.min(100, y));

    setPreviewPosition({ x: restrictedX, y: restrictedY });
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (!dragItemRef.current) return;

    const updatedOverlay = {
      ...dragItemRef.current,
      position: previewPosition,
    };

    try {
      const response = await fetch(
        `https://service-portal-backend.vercel.app/api/overlays/${updatedOverlay._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedOverlay),
        }
      );
      const data = await response.json();
      setOverlays(
        overlays.map((overlay) => (overlay._id === data._id ? data : overlay))
      );
    } catch (error) {
      console.error("Error updating overlay position:", error);
    }

    dragItemRef.current = null;
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-black text-white py-4 px-6 flex items-center justify-between">
        <div className="text-xl font-bold">Live Stream</div>
      </header>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_270px] gap-6 p-6">
        <div className="relative flex items-center w-full h-auto bg-black rounded-lg">
          <video
            ref={videoRef}
            className="w-full h-[80vh]"
            autoPlay
            playsInline
          />
          {overlays.map((overlay) => {
            const isEditing =
              editingOverlay && editingOverlay._id === overlay._id;
            const currentOverlay = isEditing ? editingOverlay : overlay;

            return (
              <div
                key={currentOverlay._id}
                className="absolute"
                style={{
                  left: `${currentOverlay.position.x}%`,
                  top: `${currentOverlay.position.y}%`,
                  transform: "translateY(-50%)", // Prevent horizontal shift, only vertical
                  width: `${currentOverlay.size}%`, // Dynamic size
                }}
              >
                {currentOverlay.type === "text" ? (
                  <p
                    className="text-white text-shadow font-bold"
                    style={{
                      fontSize: `${currentOverlay.size}%`, // Dynamic font size
                    }}
                  >
                    {currentOverlay.content}
                  </p>
                ) : (
                  <img
                    src={currentOverlay.content}
                    alt="Logo"
                    style={{ width: "100%", height: "auto" }} // Dynamic image size
                  />
                )}
              </div>
            );
          })}

          <div className="absolute flex items-center bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-transparent to-transparent text-white">
            <button
              onClick={handlePlayPause}
              className="mr-4 focus:outline-none"
            >
              {isPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>
            <input
              type="range"
              className="w-1/2 mr-4"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
            />
            <div className="flex justify-center ">
              <label className=" mr-1 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-volume-up"
                  viewBox="0 0 16 16"
                >
                  <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z" />
                  <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z" />
                  <path d="M10.025 8a4.5 4.5 0 0 1-1.318 3.182L8 10.475A3.5 3.5 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.5 4.5 0 0 1 10.025 8M7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11" />
                </svg>{" "}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            <select
              value={playbackRate}
              onChange={handlePlaybackRateChange}
              className=" border border-white bg-white text-black rounded px-2 ml-3 py-1"
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="1.75">1.75x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
        {/* Add new rendering option to visualize position change */}
        <div className="bg-white rounded-lg overflow-hidden shadow">
          <div className="items-center justify-between border-b cursor-pointer bg-gray-200 px-4 py-3">
            <h3 className="text-lg text-center font-medium">Overlays</h3>
            <div className="text-xs text-gray-500 text-center mb-1">
              Add custom text, images or Logo to your live stream
            </div>
          </div>
          <div className="p-2 grid gap-4">
            <div
              onClick={() => setIsTextModalOpen(true)}
              className="rounded-lg border cursor-pointer bg-gray-200 text-gray-700 shadow-sm"
            >
              <div className="p-1 flex items-center gap-2">
                <div className="bg-gray-300 rounded-md w-9 h-9 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-gray-600"
                  >
                    <path d="M17 6.1H3"></path>
                    <path d="M21 12.1H3"></path>
                    <path d="M15.1 18H3"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-center">
                    Add Text Overlay
                  </div>
                </div>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    fill="currentColor"
                    class="bi bi-plus-circle-dotted"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 0q-.264 0-.523.017l.064.998a7 7 0 0 1 .918 0l.064-.998A8 8 0 0 0 8 0M6.44.152q-.52.104-1.012.27l.321.948q.43-.147.884-.237L6.44.153zm4.132.271a8 8 0 0 0-1.011-.27l-.194.98q.453.09.884.237zm1.873.925a8 8 0 0 0-.906-.524l-.443.896q.413.205.793.459zM4.46.824q-.471.233-.905.524l.556.83a7 7 0 0 1 .793-.458zM2.725 1.985q-.394.346-.74.74l.752.66q.303-.345.648-.648zm11.29.74a8 8 0 0 0-.74-.74l-.66.752q.346.303.648.648zm1.161 1.735a8 8 0 0 0-.524-.905l-.83.556q.254.38.458.793l.896-.443zM1.348 3.555q-.292.433-.524.906l.896.443q.205-.413.459-.793zM.423 5.428a8 8 0 0 0-.27 1.011l.98.194q.09-.453.237-.884zM15.848 6.44a8 8 0 0 0-.27-1.012l-.948.321q.147.43.237.884zM.017 7.477a8 8 0 0 0 0 1.046l.998-.064a7 7 0 0 1 0-.918zM16 8a8 8 0 0 0-.017-.523l-.998.064a7 7 0 0 1 0 .918l.998.064A8 8 0 0 0 16 8M.152 9.56q.104.52.27 1.012l.948-.321a7 7 0 0 1-.237-.884l-.98.194zm15.425 1.012q.168-.493.27-1.011l-.98-.194q-.09.453-.237.884zM.824 11.54a8 8 0 0 0 .524.905l.83-.556a7 7 0 0 1-.458-.793zm13.828.905q.292-.434.524-.906l-.896-.443q-.205.413-.459.793zm-12.667.83q.346.394.74.74l.66-.752a7 7 0 0 1-.648-.648zm11.29.74q.394-.346.74-.74l-.752-.66q-.302.346-.648.648zm-1.735 1.161q.471-.233.905-.524l-.556-.83a7 7 0 0 1-.793.458zm-7.985-.524q.434.292.906.524l.443-.896a7 7 0 0 1-.793-.459zm1.873.925q.493.168 1.011.27l.194-.98a7 7 0 0 1-.884-.237zm4.132.271a8 8 0 0 0 1.012-.27l-.321-.948a7 7 0 0 1-.884.237l.194.98zm-2.083.135a8 8 0 0 0 1.046 0l-.064-.998a7 7 0 0 1-.918 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              onClick={() => setIsLogoModalOpen(true)}
              className="rounded-lg border cursor-pointer bg-gray-200 text-gray-700 shadow-sm"
            >
              <div className="p-1 flex items-center gap-2">
                <div className="bg-gray-300 rounded-md w-9 h-9 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-gray-600"
                  >
                    <rect
                      width="18"
                      height="18"
                      x="3"
                      y="3"
                      rx="2"
                      ry="2"
                    ></rect>
                    <circle cx="9" cy="9" r="2"></circle>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-center">
                    Add Image or Logo
                  </div>
                </div>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    fill="currentColor"
                    class="bi bi-plus-circle-dotted"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 0q-.264 0-.523.017l.064.998a7 7 0 0 1 .918 0l.064-.998A8 8 0 0 0 8 0M6.44.152q-.52.104-1.012.27l.321.948q.43-.147.884-.237L6.44.153zm4.132.271a8 8 0 0 0-1.011-.27l-.194.98q.453.09.884.237zm1.873.925a8 8 0 0 0-.906-.524l-.443.896q.413.205.793.459zM4.46.824q-.471.233-.905.524l.556.83a7 7 0 0 1 .793-.458zM2.725 1.985q-.394.346-.74.74l.752.66q.303-.345.648-.648zm11.29.74a8 8 0 0 0-.74-.74l-.66.752q.346.303.648.648zm1.161 1.735a8 8 0 0 0-.524-.905l-.83.556q.254.38.458.793l.896-.443zM1.348 3.555q-.292.433-.524.906l.896.443q.205-.413.459-.793zM.423 5.428a8 8 0 0 0-.27 1.011l.98.194q.09-.453.237-.884zM15.848 6.44a8 8 0 0 0-.27-1.012l-.948.321q.147.43.237.884zM.017 7.477a8 8 0 0 0 0 1.046l.998-.064a7 7 0 0 1 0-.918zM16 8a8 8 0 0 0-.017-.523l-.998.064a7 7 0 0 1 0 .918l.998.064A8 8 0 0 0 16 8M.152 9.56q.104.52.27 1.012l.948-.321a7 7 0 0 1-.237-.884l-.98.194zm15.425 1.012q.168-.493.27-1.011l-.98-.194q-.09.453-.237.884zM.824 11.54a8 8 0 0 0 .524.905l.83-.556a7 7 0 0 1-.458-.793zm13.828.905q.292-.434.524-.906l-.896-.443q-.205.413-.459.793zm-12.667.83q.346.394.74.74l.66-.752a7 7 0 0 1-.648-.648zm11.29.74q.394-.346.74-.74l-.752-.66q-.302.346-.648.648zm-1.735 1.161q.471-.233.905-.524l-.556-.83a7 7 0 0 1-.793.458zm-7.985-.524q.434.292.906.524l.443-.896a7 7 0 0 1-.793-.459zm1.873.925q.493.168 1.011.27l.194-.98a7 7 0 0 1-.884-.237zm4.132.271a8 8 0 0 0 1.012-.27l-.321-.948a7 7 0 0 1-.884.237l.194.98zm-2.083.135a8 8 0 0 0 1.046 0l-.064-.998a7 7 0 0 1-.918 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="rounded-lg border bg-gray-100 shadow-sm">
              <div className="text-sm text-center pt-2">
                Edit Your Added Text And Logo
              </div>
              <div className="p-3 gap-3 grid">
                {overlays.map((overlay) => (
                  <div
                    key={overlay._id}
                    className="flex p-1 px-2 rounded-md shadow text-sm bg-orange-300 items-center justify-between"
                  >
                    {overlay.type === "text" ? "Text" : "Logo"}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteOverlay(overlay._id)}
                        className="hover:bg-orange-200 rounded-full flex justify-center items-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0" />
                        </svg>
                      </button>
                      <button
                        onClick={() => editOverlay(overlay)}
                        className="hover:bg-orange-200 rounded-full flex justify-center items-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          <path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"></path>
                          <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                          <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isTextModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Add Text Overlay</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Text Content
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={newOverlay.content}
                onChange={(e) =>
                  setNewOverlay({ ...newOverlay, content: e.target.value })
                }
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Size
              </label>
              <input
                type="range"
                min="50"
                max="200"
                value={newOverlay.size}
                onChange={(e) => handleSizeChange(e, true)}
                className="mt-1 block w-full"
              />
              <span>{newOverlay.size}%</span>
            </div>
            <div className="flex justify-end">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
                onClick={addTextOverlay}
              >
                Add
              </button>
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                onClick={() => setIsTextModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLogoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Add Logo Overlay</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Upload Logo
              </label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Size
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={newOverlay.size}
                onChange={(e) => handleSizeChange(e, true)}
                className="mt-1 block w-full"
              />
              <span>{newOverlay.size}%</span>
            </div>
            <div className="flex justify-end">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
                onClick={addLogoOverlay}
              >
                Add
              </button>
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                onClick={() => setIsLogoModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Edit Overlay</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Content
              </label>
              {editingOverlay?.type === "text" ? (
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={editingOverlay?.content || ""}
                  onChange={(e) =>
                    setEditingOverlay({
                      ...editingOverlay,
                      content: e.target.value,
                    })
                  }
                />
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setEditingOverlay({
                          ...editingOverlay,
                          content: e.target.result,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Size
              </label>
              <input
                type="range"
                min={editingOverlay?.type === "text" ? "50" : "10"}
                max={editingOverlay?.type === "text" ? "200" : "100"}
                value={editingOverlay?.size || 100}
                onChange={handleSizeChange}
                className="mt-1 block w-full"
              />
              <span>{editingOverlay?.size || 100}%</span>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Position
              </label>
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => handlePositionChange("up")}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-t"
                >
                  ▲
                </button>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => handlePositionChange("left")}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-l"
                >
                  ◀
                </button>
                <button
                  onClick={() => handlePositionChange("right")}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-r"
                >
                  ▶
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => handlePositionChange("down")}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-b"
                >
                  ▼
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
                onClick={updateOverlay}
              >
                Update
              </button>
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveStream;
