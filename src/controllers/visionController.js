import { extractQuestionFromImage } from '../services/visionService.js';

export const extractQuestion = async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ message: 'No image provided. Send base64 data in "imageBase64".' });
    }

    const base64String = imageBase64.trim();
    const base64Data = base64String.includes(',') ? base64String.split(',').pop() : base64String;

    const buffer = Buffer.from(base64Data, 'base64');

    if (!buffer.length) {
      return res.status(400).json({ message: 'Provided image data is invalid.' });
    }

    const text = await extractQuestionFromImage(buffer, mimeType ?? 'image/jpeg');
    if (!text) {
      return res.status(422).json({ message: 'No text detected in the image.' });
    }

    const cleaned = text
      .replace(/<[^>]*>/g, '')
      .replace(/\*\*/g, '')
      .trim();

    return res.json({ success: true, data: { text: cleaned } });
  } catch (error) {
    return next(error);
  }
};
