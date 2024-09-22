import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [videoUrl, setVideoUrl] = useState(""); // State to manage input value
  const navigate = useNavigate();

  const handlePlay = () => {
    if (videoUrl) {
      // Encode the video URL to safely include it in the route
      const encodedUrl = encodeURIComponent(videoUrl);
      // Navigate to the /livestream/:videoUrl route
      navigate(`/livestream/${encodedUrl}`);
    } else {
      alert("Please enter a valid video URL.");
    }
  };

  return (
    <div>
      <header className="bg-black text-white py-4 px-6 flex items-center justify-between">
        <div className="text-xl font-bold">Live Stream</div>
      </header>
      <div className="flex justify-center items-center h-screen">
        <div className="flex justify-center items-center gap-4">
          <input
            className="h-12 px-6 rounded-lg bg-gray-200 w-[60vh]"
            placeholder="Enter Your Live Video URL"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)} // Update state with input value
          />
          <button
            onClick={handlePlay}
            className="bg-black h-12 w-[20vh] hover:bg-gray-700 text-white px-6 rounded-lg"
          >
            Play
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
