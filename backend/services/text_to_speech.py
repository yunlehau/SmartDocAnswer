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

    # Load the pre-trained TTS model and tokenizer
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
    
    # Encode the WAV file bytes as base64
    base64_audio = base64.b64encode(output_np).decode('utf-8')

    return base64_audio