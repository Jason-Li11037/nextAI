import React, { useState, useEffect, useRef } from "react"; // Import useState
import axios from "axios";
import { Button, Input } from "antd";
import { AudioOutlined } from "@ant-design/icons";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { API_URL } from "../config";

const { Search } = Input;

const SPEECH_LANG = "en-US";
const PREFERRED_VOICE = "Google US English";

const searchContainer = {
  display: "flex",
  justifyContent: "center",
};

const ChatComponent = (props) => {
  const { handleResp, isLoading, setIsLoading } = props;
  // Define a state variable to keep track of the search value
  const [searchValue, setSearchValue] = useState("");
  const [isChatModeOn, setIsChatModeOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  // The voice used to read answers aloud, chosen once the browser has loaded its voices
  const voiceRef = useRef(null);

  // speech recognation
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  // Always points at the latest onSearch, so the effect below can call it
  // without listing it as a dependency (it changes on every render).
  const onSearchRef = useRef();
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      console.error("Speech synthesis is not supported in this browser");
      return undefined;
    }
    const synth = window.speechSynthesis;
    // Browsers load their voices asynchronously, so pick again when the list changes
    const pickVoice = () => {
      const voices = synth.getVoices();
      if (voices.length === 0) {
        return;
      }
      voiceRef.current =
        voices.find((voice) => voice.name === PREFERRED_VOICE) ||
        voices.find((voice) => voice.lang === SPEECH_LANG) ||
        null;
      console.log("Speech is ready, voices are available", voices.length);
    };
    pickVoice();
    synth.addEventListener("voiceschanged", pickVoice);
    return () => synth.removeEventListener("voiceschanged", pickVoice);
  }, []);

  useEffect(() => {
    if (!listening && Boolean(transcript)) {
      (async () => await onSearchRef.current(transcript))();
      setIsRecording(false);
    }
  }, [listening, transcript]);

  const talk = (what2say) => {
    if (!("speechSynthesis" in window)) {
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) {
      // current speech will be interrupted
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(what2say);
    utterance.lang = SPEECH_LANG;
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }
    utterance.onstart = () => {
      console.log("Start utterance");
    };
    utterance.onresume = () => {
      console.log("Resume utterance");
    };
    utterance.onboundary = (event) => {
      console.log(
        event.name +
          " boundary reached after " +
          event.elapsedTime +
          " milliseconds."
      );
    };
    utterance.onerror = (event) => {
      console.error("An error occurred :", event);
    };
    utterance.onend = () => {
      console.log("End utterance");
      // if everything went well, start listening again
      userStartConvo();
    };
    synth.speak(utterance);
  };

  const userStartConvo = () => {
    SpeechRecognition.startListening();
    setIsRecording(true);
    resetTranscript();
  };

  const chatModeClickHandler = () => {
    setIsChatModeOn(!isChatModeOn);
    setIsRecording(false);
    SpeechRecognition.stopListening();

    resetTranscript();
  };

  const recordingClickHandler = () => {
    if (isRecording) {
      setIsRecording(false);
      SpeechRecognition.stopListening();

      resetTranscript();
    } else {
      setIsRecording(true);
      SpeechRecognition.startListening();
    }
  };

  const onSearch = async (question) => {
    // Clear the search input
    setSearchValue("");
    setIsLoading(true);

    try {
      const response = await axios.get(`${API_URL}/chat`, {
        params: {
          question,
        },
      });
      handleResp(question, response.data);
      if (isChatModeOn) {
        talk(response.data?.ragAnswer);
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      handleResp(question, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    // Update searchValue state when the user types in the input box
    setSearchValue(e.target.value);
  };

  return (
    <div style={searchContainer}>
      {!isChatModeOn && (
        <Search
          placeholder="input search text"
          enterButton="Ask"
          size="large"
          onSearch={onSearch}
          loading={isLoading}
          value={searchValue} // Control the value
          onChange={handleChange} // Update the value when changed
        />
      )}
      <Button
        type="primary"
        size="large"
        danger={isChatModeOn}
        onClick={chatModeClickHandler}
        style={{ marginLeft: "5px" }}
      >
        Chat Mode: {isChatModeOn ? "On" : "Off"}
      </Button>
      {isChatModeOn && (
        <Button
          type="primary"
          icon={<AudioOutlined />}
          size="large"
          danger={isRecording}
          onClick={recordingClickHandler}
          style={{ marginLeft: "5px" }}
        >
          {isRecording ? "Recording..." : "Click to record"}
        </Button>
      )}
    </div>
  );
};

export default ChatComponent;
