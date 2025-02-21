import { type Note } from '../types';

export class NotesService {
  private static API_URL = 'https://api.openai.com/v1/chat/completions';
  private static BACKEND_URL = 'http://localhost:3000'; // Our local backend server

  static async generateNotes(transcript: string): Promise<Note> {
    try {
      console.log('Sending request with transcript:', transcript.substring(0, 100) + '...');
      
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.config.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-2024-07-18",
          messages: [
            {
              role: "system",
              content: `You are an expert at creating detailed, well-structured lecture summaries in LaTeX format. Generate a complete LaTeX document that summarizes the lecture content. Follow these rules:

1. Use proper LaTeX sectioning (\\section, \\subsection)
2. Use proper LaTeX environments for different content types
3. Keep the LaTeX structure simple and valid
4. Don't include code blocks unless specifically mentioned in the transcript
5. Don't use unsupported packages

Use this exact structure:

\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage[margin=2.5cm]{geometry}

\\title{[COURSE_NAME]}
\\author{Generated by LectureMate}
\\date{\\today}

\\begin{document}

\\maketitle

[CONTENT]

\\end{document}`
            },
            {
              role: "user",
              content: `Create a comprehensive lecture summary in LaTeX format. Include all technical details, examples, and practical applications. Use proper LaTeX sectioning and formatting:\n\n${transcript}`
            }
          ],
          max_tokens: 4096,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          error: errorData
        });
        throw new Error(errorData.error?.message || `Failed to generate notes: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Success Response:', data);
      
      return {
        content: data.choices[0].message.content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Full error details:', error);
      throw error;
    }
  }

  static async generatePDF(content: string, courseName: string, weekTitle: string): Promise<Blob> {
    try {
      // Clean up the LaTeX content
      let latexContent = content;
      
      // Remove any markdown code block markers
      latexContent = latexContent.replace(/```latex\s*|\s*```/g, '');
      
      // Replace the course name placeholder
      latexContent = latexContent.replace(/\[COURSE_NAME\]/g, `${courseName} - ${weekTitle}`);

      // Send to our backend for PDF generation
      const response = await fetch(`${this.BACKEND_URL}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latex: latexContent
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PDF generation failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      // Get the PDF blob directly from the response
      return await response.blob();
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
} 