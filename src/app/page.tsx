"use client";

import fetch from "cross-fetch";
import { getSession } from "next-auth/react";
import Groq, { toFile } from "groq-sdk";
import Cartesia from "@cartesia/cartesia-js";
import { WebPlayer } from "@cartesia/cartesia-js";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getWeather, getWeatherSchema } from "@/app/tools";
import { reflectiveWomanEmbedding } from "@/app/voices";

const PLAY_RECORDED_AUDIO = false;
const GRAY_COLOR = "#30323E";
const GROQ_ORANGE = "#F55036";

const toolHandlers: { [key: string]: (...args: any[]) => any } = {
  getWeather: getWeather,
};

function useTTS(cartesia: Cartesia | null) {
  const websocket = useRef<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (cartesia) {
      const initializeWebSocket = async () => {
        if (!websocket.current) {
          websocket.current = cartesia.tts.websocket({ sampleRate: 44100 });

          try {
            await websocket.current.connect();
          } catch (error) {
            console.error(`Failed to connect to Cartesia: ${error}`);
          }
        }
      };

      initializeWebSocket();
    }
  }, [cartesia, websocket]);

  const startPlayer = async (response: any) => {
    const player = new WebPlayer({ bufferDuration: 0.02 });
    setIsPlaying(true);
    await player.play(response.source);
    setIsPlaying(false);
  };

  const speak = async (text: string) => {
    if (!cartesia) {
      console.warn("Cartesia is null, speak is a no-op");
      return;
    }

    const startTime = performance.now();

    try {
      const response = await websocket.current.send({
        model_id: "upbeat-moon",
        voice: {
          mode: "embedding",
          embedding: reflectiveWomanEmbedding,
        },
        transcript: text,
      });

      let receivedFirst = false;
      for await (const message of response.events("message")) {
        if (!receivedFirst) {
          const endTime = performance.now();
          console.log(`[SPEACH]: ${(endTime - startTime).toFixed(2)} ms`);
          await startPlayer(response);
          receivedFirst = true;
        }
      }
    } catch (error) {
      console.error(`Error sending message: ${error}`);
    }
  };

  return { speak, isPlaying: cartesia ? isPlaying : false };
}

async function transcribe(blob: Blob, groq: Groq) {
  const startTime = performance.now();
  const response = await groq.audio.translations.create({
    file: await toFile(blob, "audio.webm"),
    model: "whisper-large-v3",
    prompt: "",
    response_format: "json",
    temperature: 0,
  });
  const endTime = performance.now();
  console.log(`[TRANSCRIPTION]: ${(endTime - startTime).toFixed(2)} ms`);
  return response;
}

async function streamCompletion(
  messages: Groq.Chat.ChatCompletionMessageParam[],
  groq: Groq
): Promise<{
  contentBuffer: string;
  toolCalls: Groq.Chat.ChatCompletionMessageToolCall[];
}> {
  const startTime = performance.now();
  const stream = true;
  const toolCallDeltas = [];

  const response = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant.
        
You are Samantha.

Respond in brief natural sentences. Use tools when appropriate before giving a response. Only use a tool if it is necessary.`,
      },
      ...messages,
    ],
    tools: [getWeatherSchema],
    model: "llama3-70b-8192",
    temperature: 0.7,
    max_tokens: 1024,
    seed: 42,
    top_p: 1,
    stream: stream,
  });

  let contentBuffer = "";
  if (stream) {
    // @ts-ignore
    for await (const chunk of response) {
      if (chunk.choices[0]?.delta?.content) {
        contentBuffer += chunk.choices[0]?.delta?.content;
      }
      if (chunk.choices[0].delta.tool_calls) {
        toolCallDeltas.push(...chunk.choices[0].delta.tool_calls);
      }
    }
  } else {
    // @ts-ignore
    contentBuffer = response.choices[0].message.content;
  }
  const endTime = performance.now();
  console.log(`[COMPLETION]: ${(endTime - startTime).toFixed(2)} ms`);

  // Convert toolCallDeltas to toolCalls
  const toolCallBuffers: {
    [key: number]: Groq.Chat.ChatCompletionMessageToolCall;
  } = {};

  for (const toolCallDelta of toolCallDeltas) {
    const index = toolCallDelta.index;
    if (!toolCallBuffers[index]) {
      toolCallBuffers[index] = {
        id: toolCallDelta.id || "",
        type: "function",
        function: {
          arguments: "",
          name: "",
        },
      };
    }
    if (toolCallDelta.function?.arguments) {
      toolCallBuffers[index].function.arguments +=
        toolCallDelta.function.arguments;
    }
    if (toolCallDelta.function?.name) {
      toolCallBuffers[index].function.name += toolCallDelta.function.name;
    }
  }

  const toolCalls: Groq.Chat.ChatCompletionMessageToolCall[] =
    Object.values(toolCallBuffers);

  return { contentBuffer, toolCalls };
}

interface UseAudioRecorderProps {
  onTranscribe: (transcription: string) => void;
  onRecordingStart: () => void;
  onRecordingEnd: () => void;
  groq: Groq;
}

const useAudioRecorder = ({
  onTranscribe,
  onRecordingStart,
  onRecordingEnd,
  groq,
}: UseAudioRecorderProps) => {
  const isRecording = useRef<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const audioChunksRef = useRef<Blob[]>([]);
  const [mimeType, setMimeType] = useState<string>("audio/webm;codecs=opus");
  const [supportedMimeTypes, setSupportedMimeTypes] = useState<string[]>([]);
  const [volume, setVolume] = useState<number>(0);

  useEffect(() => {
    const typesToCheck = [
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/webm;codecs=vorbis",
      "audio/ogg",
      "audio/ogg;codecs=opus",
      "audio/ogg;codecs=vorbis",
      "audio/mp4",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/wav",
      "audio/mpeg",
    ];
    const supportedTypes = typesToCheck.filter((type) =>
      MediaRecorder.isTypeSupported(type)
    );
    setSupportedMimeTypes(supportedTypes);

    // set mime type to the first supported type
    setMimeType(supportedTypes[0]);
  }, []);

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Media Devices will not work on this browser.");
      return;
    }
    onRecordingStart();
    isRecording.current = true;
    const audioConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.error(`MIME type ${mimeType} is not supported on this browser.`);
      return;
    }
    const recorderOptions = {
      mimeType,
      audioBitsPerSecond: 96000 / 4,
    };
    const recorder = new MediaRecorder(stream, recorderOptions);
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    recorder.ondataavailable = (event: BlobEvent) => {
      audioChunksRef.current.push(event.data);
    };
    recorder.start();
    setMediaRecorder(recorder);
    audioChunksRef.current = [];

    const getVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      setVolume(average);
      requestAnimationFrame(getVolume);
    };
    getVolume();
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.onstop = () => {
        handleChunks();
      };
    }
    mediaRecorder?.stop();
    mediaRecorder?.stream
      .getTracks()
      .forEach((track: MediaStreamTrack) => track.stop());
    isRecording.current = false;
    onRecordingEnd();
    setVolume(0);
  };

  async function handleChunks() {
    let transcription = "";
    for (const chunk of audioChunksRef.current) {
      if (PLAY_RECORDED_AUDIO) {
        const audioUrl = URL.createObjectURL(chunk);
        const audio = new Audio(audioUrl);
        audio.play();
      }

      console.log(`Audio chunk size: ${chunk.size} bytes`);
      transcription += (await transcribe(chunk, groq)).text;
    }

    // We trim by default to avoid problematic leading/trailing whitespace
    transcription = transcription.trim();

    if (transcription.length > 0) {
      onTranscribe(transcription);
    }
  }

  return {
    isRecording: isRecording.current,
    volume,
    startRecording,
    stopRecording,
  };
};

const AudioAnimation = ({ playing }: { playing: boolean }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0); // Store progress between rerenders
  const timestampRef = useRef<number>(0); // Store progress between rerenders

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const baseColor = GRAY_COLOR;
    const playingColors = ["#F55036", "#B84735", "#833B2F", "#762417"];
    const animationSpeed = playing ? 5 : 0.5; // Fast for true, slow for false

    const centerCircle = container.querySelector(
      ".center-circle"
    ) as HTMLDivElement;
    const circles = container.querySelectorAll(
      ".oscillating-circle"
    ) as NodeListOf<HTMLDivElement>;

    const animate = (timestamp: number) => {
      if (!timestamp) return;
      let delta = timestamp - timestampRef.current;
      const progress = progressRef.current + (delta * animationSpeed) / 9000;
      progressRef.current = progress;
      timestampRef.current = timestamp;

      // Update center circle color
      if (centerCircle) {
        centerCircle.style.backgroundColor = playing
          ? playingColors[0]
          : baseColor;
      }

      // Update oscillating circles border color and animation
      circles.forEach((circle, index) => {
        circle.style.borderColor = playing ? playingColors[index] : baseColor;
        const scale =
          1 + (0.5 * Math.sin((progress + index * 0.3) * (2 * Math.PI)) + 0.5);
        circle.style.transform = `translate(-50%, -50%) scale(${scale})`;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playing]);

  return (
    <div
      id="audio-animation-container"
      ref={containerRef}
      style={{
        position: "relative",
        width: `${Math.min(window.innerWidth * 0.6, 350)}px`,
        height: `${Math.min(window.innerWidth * 0.6, 350)}px`,
      }}
    >
      <div
        className="center-circle"
        style={{
          position: "absolute",
          width: "50%",
          height: "50%",
          borderRadius: "50%",
          backgroundColor: GRAY_COLOR,
          transition: "background-color 0.5s ease",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="oscillating-circle"
          style={{
            position: "absolute",
            width: "50%",
            height: "50%",
            borderRadius: "50%",
            transition: "border-color 0.5s ease",
            border: `1px solid ${GRAY_COLOR}`,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
};

function App({
  cartesiaApiKey,
  groqApiKey,
}: {
  cartesiaApiKey: string;
  groqApiKey: string;
}) {
  const cartesia = cartesiaApiKey
    ? new Cartesia({
        apiKey: cartesiaApiKey,
      })
    : null;

  const groq = new Groq({
    apiKey: groqApiKey,
    dangerouslyAllowBrowser: true,
  });

  const historyRef = useRef<Groq.Chat.ChatCompletionMessageParam[]>([]);
  const [historyLastUpdate, setHistoryLastUpdate] = useState(new Date());
  const { speak, isPlaying } = useTTS(cartesia);

  const { isRecording, startRecording, stopRecording, volume } =
    useAudioRecorder({
      onTranscribe: async (transcription: string) => {
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: transcription },
        ];

        await triggerCompletionFlow();
      },
      onRecordingStart: () => {
        historyRef.current = [...historyRef.current];
      },
      onRecordingEnd: () => {
        // No additional actions needed for now
      },
      groq,
    });

  const [isShowingMessages, setIsShowingMessages] = useState(cartesia === null);

  const handleClick = () => {
    setIsShowingMessages(!isShowingMessages);
  };

  const handleMicrophonePress = () => {
    startRecording();
  };

  const handleMicrophoneRelease = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const triggerCompletionFlow = async () => {
    
    const { contentBuffer: response, toolCalls } = await streamCompletion(
      historyRef.current,
      groq
    );
    setHistoryLastUpdate(new Date());

    // In the completion flow we also handle 
    // calling the generated toolCalls in case there are any, which can recursively
    // call triggerCompletionFlow in case
    // more toolCalls are generated.
    if (toolCalls.length > 0) {
      await handleToolCalls(toolCalls);
    }

    if (response.length > 0) {
      setHistoryLastUpdate(new Date());
      historyRef.current = [
        ...historyRef.current,
        { role: "assistant", content: response },
      ];
      await speak(response);
    }
  };

  // trigger handleMicrophoneRelease when the focus is lost
  useEffect(() => {
    const handleFocusLoss = () => {
      handleMicrophoneRelease();
    };
    window.addEventListener("focus", handleFocusLoss);
    return () => window.removeEventListener("focus", handleFocusLoss);
  }, [handleMicrophoneRelease]);

  // Scroll to bottom when history changes
  useEffect(() => {
    const chatContainer = document.getElementById("chat-container");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    const observer = new MutationObserver(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    });
    if (chatContainer) {
      observer.observe(chatContainer, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, []);

  const handleToolCalls = async (
    toolCalls: Groq.Chat.ChatCompletionMessageToolCall[]
  ) => {
    // Assumed only called with toolCalls > 0
    if (toolCalls.length == 0) {
      throw new Error("only call handleToolCalls with toolCalls > 0");
    }

    historyRef.current = [
      ...historyRef.current,
      { role: "assistant", tool_calls: toolCalls },
    ];

    for (const toolCall of toolCalls) {
      const { function: toolFunction } = toolCall;
      if (toolFunction && toolHandlers[toolFunction.name]) {
        const toolResponse = await toolHandlers[toolFunction.name](
          JSON.parse(toolFunction.arguments)
        );

        historyRef.current = [
          ...historyRef.current,
          { role: "tool", content: toolResponse, tool_call_id: toolCall.id },
        ];
      }
    }
    await triggerCompletionFlow();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <Image width={80} height={40} src="groq.svg" alt="groq" />
      </div>
      {!isShowingMessages && (
        <div className="flex justify-center items-center h-full absolute top-0 left-0 w-full h-full">
          <AudioAnimation playing={isPlaying} />
        </div>
      )}
      <div id="chat-container" className="p-2 flex-grow overflow-x-auto">
        <div
          className="fixed bottom-4 left-4 p-2 rounded-full cursor-pointer select-none"
          style={{
            backgroundColor: isShowingMessages ? GROQ_ORANGE : GRAY_COLOR,
          }}
          onClick={handleClick}
        >
          <Image
            src={
              isShowingMessages ? "chat-bubble-white.svg" : "chat-bubble.svg"
            }
            alt="chat bubble"
            width={20}
            height={20}
          />
        </div>
        <div className="fixed bottom-4 right-4 select-none cursor-pointer">
          <div
            id="microphone-button"
            className={`p-6 rounded-full ${
              isRecording ? "recording-animation" : ""
            }`}
            style={{
              backgroundColor: isRecording ? GROQ_ORANGE : GRAY_COLOR,
              transition: "transform 0.05s ease",
              transform: `scale(${1 + volume / 100 + (isRecording ? 0.1 : 0)})`,
              boxShadow: isRecording
                ? "0 0 39px 37px rgba(245, 80, 54, 0.7)"
                : "none",
            }}
            onMouseDown={handleMicrophonePress}
            onMouseUp={handleMicrophoneRelease}
            onTouchStart={handleMicrophonePress}
            onTouchEnd={handleMicrophoneRelease}
          >
            <div
              style={{
                transform: `scale(${1 / (1 + volume / 100)})`,
              }}
            >
              <Image
                src={isRecording ? "microphone-white.svg" : "microphone.svg"}
                className="pointer-events-none"
                alt="microphone"
                width={30}
                height={30}
              />
            </div>
          </div>
        </div>

        {isShowingMessages && (
          <>
            <div className="flex flex-col pb-24">
              {historyRef.current.slice().map((message: any, index) => (
                <div
                  key={index}
                  className={`p-2 mb-4 rounded-lg ${
                    message.role === "user"
                      ? "message-user self-end"
                      : "message-assistant self-start"
                  }`}
                >
                  {message.role === "tool" ? (
                    <pre>
                      {JSON.stringify(JSON.parse(message.content), null, 2)}
                    </pre>
                  ) : message.role === "assistant" && message.tool_calls ? (
                    <pre>{JSON.stringify(message.tool_calls, null, 2)}</pre>
                  ) : (
                    message.content
                  )}
                  {index === historyRef.current.length - 1 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {historyLastUpdate.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {historyRef.current.length == 0 && (
              <div className="flex justify-center items-center">
                <p>Start a conversation by asking a question.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const session = getSession();
  const router = useRouter();

  useEffect(() => {
    const touchHandler = (ev: any) => {
      let currentElement = ev.target;
      while (currentElement) {
        if (currentElement.id === "microphone-button") {
          ev.preventDefault();
          break;
        }
        currentElement = currentElement.parentElement;
      }
    };

    document.addEventListener("touchstart", touchHandler, { passive: false });
    document.addEventListener("touchmove", touchHandler, { passive: false });
    document.addEventListener("touchend", touchHandler, { passive: false });
    document.addEventListener("touchcancel", touchHandler, { passive: false });

    return () => {
      document.removeEventListener("touchstart", touchHandler);
      document.removeEventListener("touchmove", touchHandler);
      document.removeEventListener("touchend", touchHandler);
      document.removeEventListener("touchcancel", touchHandler);
    };
  }, []);

  session.then((session) => {
    if (!session || !session.user) {
      router.push("/auth/signin");
    }
  });

  const [keys, setKeys] = useState<{
    cartesiaApiKey: string;
    groqApiKey: string;
  } | null>(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const keysEndpoint = "/api/keys";
        const response = await fetch(keysEndpoint);
        if (response.status === 200) {
          const keys = await response.json();
          setKeys(keys);
        } else {
          throw new Error("Failed to fetch API keys: " + response.statusText);
        }
      } catch (error) {
        console.error("Failed to fetch API keys:", error);
      }
    };

    fetchApiKeys();
  }, []);
  if (keys) {
    return (
      <App cartesiaApiKey={keys.cartesiaApiKey} groqApiKey={keys.groqApiKey} />
    );
  } else {
    return <div>Loading...</div>;
  }
}
