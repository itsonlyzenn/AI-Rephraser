export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sentence, context, tone } = req.body;

    if (!sentence) {
        return res.status(400).json({ error: 'Kalimat asli tidak boleh kosong.' });
    }

    // Mengambil API Key dari Environment Variables Vercel (AMAN, tidak bocor ke publik)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server Vercel.' });
    }

    const prompt = `Bertindaklah sebagai ahli komunikasi profesional. Haluskan atau santunkan kalimat berikut agar enak dibaca, sopan, namun tidak menghilangkan maksud aslinya.
            
Kalimat Asli: "${sentence}"
Kondisi/Audience: "${context || 'Umum'}"
Gaya Bahasa yang diinginkan: "${tone || 'Profesional & Formal'}"

Berikan HANYA hasil kalimat yang sudah diperhalus tanpa teks pengantar, basa-basi, atau tanda kutip tambahan.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Gemini API Error');
        }

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Gagal menghasilkan respons.';

        return res.status(200).json({ result: resultText });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}