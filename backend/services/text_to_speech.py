import torch
import io
import base64
import numpy as np
from transformers import VitsModel, AutoTokenizer
from langdetect import detect
import scipy.io.wavfile as wav

def text_to_speech(text: str):
    # Detect language
    language = detect(text)

    # Load the pre-trained TTS model and tokenizer based on the detected language
    if language == "vi":
        tts_model = VitsModel.from_pretrained("facebook/mms-tts-vie")
        tts_tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-vie")
    else:
        tts_model = VitsModel.from_pretrained("facebook/mms-tts-eng")
        tts_tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-eng")
    
    # Tokenize the input text
    inputs = tts_tokenizer(text, return_tensors="pt")
    
    # Generate waveform (audio)
    with torch.no_grad():
        output = tts_model(**inputs).waveform
    
    # Convert tensor to numpy array and normalize
    output_np = output.cpu().numpy().squeeze()
    output_np = np.int16(output_np / np.max(np.abs(output_np)) * 32767)  # Normalize to int16 range
    
    # Create a BytesIO object to store the audio in-memory
    audio_io = io.BytesIO()
    
    # Write the numpy array as a WAV file into the BytesIO object
    wav.write(audio_io, rate=tts_model.config.sampling_rate, data=output_np)
    
    # Seek back to the beginning of the BytesIO object before reading it
    audio_io.seek(0)
    
    # Base64 encode the WAV file bytes directly from BytesIO
    base64_audio = base64.b64encode(audio_io.read()).decode('utf-8')

    return base64_audio
