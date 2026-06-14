import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route
  app.post('/api/analyze', async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: 'Missing image or mimeType' });
      }

      if (!process.env.GEMINI_API_KEY) {
         return res.status(500).json({ error: 'GEMINI_API_KEY is not defined on the server.' });
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build',
            }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: image,
                mimeType,
              },
            },
            {
              text: "أنت خبير في الرؤية الحاسوبية وطبيب عيون متمرس. قم بتحليل صورة العين المرفقة. اكتشف أي مشاكل محتملة مثل: احمرار العين، اصفرار الصلبة، إجهاد العين، المياه البيضاء (Cataracts)، وغيرها. استخدم نظام الإحداثيات حيث أعلى يسار الصورة هو [0, 0] وأسفل يمين الصورة هو [1000, 1000]. قم بتحديد مكان المشكلة (إن وجدت) بإحداثيات الصندوق المحيط [ymin, xmin, ymax, xmax].",
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosis: {
                type: Type.STRING,
                description: "التشخيص المحتمل (مثال: 'مياه بيضاء'، 'احمرار وإجهاد'، 'عين سليمة')",
              },
              confidence: {
                type: Type.NUMBER,
                description: "نسبة الثقة في التشخيص برقم من 0 إلى 100",
              },
              details: {
                type: Type.STRING,
                description: "شرح طبي مبسط وواضح للحالة المكتشفة",
              },
              boundingBox: {
                type: Type.ARRAY,
                items: {
                  type: Type.NUMBER,
                },
                description: "الصندوق المحيط بمكان المشكلة بصيغة [ymin, xmin, ymax, xmax] تتراوح من 0 إلى 1000. إن كانت العين سليمة أو المشكلة منتشرة بشكل لا يمكن حصره بصندوق، اترك المصفوفة فارغة.",
              },
            },
            required: ['diagnosis', 'confidence', 'details', 'boundingBox'],
          },
        },
      });

      const jsonStr = response.text?.trim() || "";
      if (!jsonStr) {
        throw new Error("No text response from Gemini");
      }

      const result = JSON.parse(jsonStr);
      res.json(result);
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      res.status(500).json({ error: error?.message || 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
