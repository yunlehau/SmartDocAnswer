import pytesseract
from PIL import Image

# Function to process text using OpenAI API (e.g., summarization or correction)
def ocr_page(image_path, client, model_name):

    try:
        # Open the image file
        img = Image.open(image_path)

        # Extract text using pytesseract (OCR)
        text = pytesseract.image_to_string(img)

        # Send the OCR text to OpenAI for processing (e.g., summarization)
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that processes text."},
                {"role": "user", "content": f"Please summarize and and extract the key words or key phrases that reflect its main themes and ideas the following text:\n {text}"}
            ],
            max_tokens=200,
        )

        # Get the processed text from OpenAI
        processed_text = response.choices[0].message.content
        combined_text = text + "\n\n" + processed_text

        return combined_text
    except Exception as e:
        print(f"Error processing text with OpenAI: {e}")
        return None
