from flask import Flask, request, jsonify
from openai import OpenAI
from flask_cors import CORS
import os
import PyPDF2
from io import BytesIO

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-3fv-EeXCjYP3xeigsr9O3w")
OPENAI_ENDPOINT = "https://aiportalapi.stu-platform.live/jpe"
MODEL_NAME = "GPT-4.1"  # Adjust based on your OpenAI model

# Initialize OpenAI client with custom endpoint
client = OpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_ENDPOINT
)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        # Check if file and message are provided
        if 'context_file' not in request.files or 'message' not in request.form:
            return jsonify({
                "error": "Both 'context_file' (text or PDF file) and 'message' are required",
                "status": "error"
            }), 400

        # Get uploaded file and message
        file = request.files['context_file']
        user_input = request.form['message']

        # Validate file extension
        if not file.filename.lower().endswith(('.txt', '.pdf')):
            return jsonify({
                "error": "Only .txt or .pdf files are supported",
                "status": "error"
            }), 400

        if not user_input:
            return jsonify({
                "error": "No message provided",
                "status": "error"
            }), 400

        # Read context based on file extension
        try:
            if file.filename.lower().endswith('.txt'):
                DOCUMENT_CONTEXT = file.read().decode('utf-8')
            elif file.filename.lower().endswith('.pdf'):
                pdf_reader = PyPDF2.PdfReader(BytesIO(file.read()))
                DOCUMENT_CONTEXT = ""
                for page in pdf_reader.pages:
                    extracted_text = page.extract_text()
                    if extracted_text:
                        DOCUMENT_CONTEXT += extracted_text + "\n"
            
            if not DOCUMENT_CONTEXT.strip():
                return jsonify({
                    "error": "Uploaded file is empty or no text could be extracted",
                    "status": "error"
                }), 400
        except Exception as e:
            return jsonify({
                "error": f"Failed to read uploaded file: {str(e)}",
                "status": "error"
            }), 500

        # Combine user input with document context for LLM
        prompt = (
            f"You are an assistant that answers questions based solely on the following document content:\n\n"
            f"{DOCUMENT_CONTEXT}\n\n"
            f"Do not use any external knowledge or information beyond this document. "
            f"If the answer is not found in the document, respond with 'Information not available in the provided document.' "
            f"Now, answer the following question: {user_input}"
        )

        # Call OpenAI API
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful assistant restricted to the provided document context."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )

        # Extract response
        llm_response = response.choices[0].message.content

        return jsonify({
            "response": llm_response,
            "status": "success"
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "API is running"}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)