export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sentence, context, tone } = req.body;

    if (!sentence) {
        return res.status(400).json({ error: 'Kalimat asli tidak boleh kosong.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server Vercel.' });
    }

    const prompt = `Bertindaklah sebagai ahli komunikasi profesional. Haluskan atau santunkan kalimat berikut agar enak dibaca, sopan, namun tidak menghilangkan maksud aslinya.
            
Kalimat Asli: "${sentence}"
Kondisi/Audience: "${context || 'Umum'}"
Gaya Bahasa yang diinginkan: "${tone || 'Profesional & Formal'}"

Berikan HANYA hasil kalimat yang sudah diperhalus tanpa teks pengantar, basa-basi, atau tanda kutip tambahan.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
    
    // Mekanisme Auto-Retry (Coba ulang otomatis kalau kena 502 / server overload)
    const maxRetries = 3;
    let delay = 1500; // Jeda awal 1.5 detik

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            // Kalau kena 502 Bad Gateway atau 503, jangan langsung error, tapi retry
            if ((response.status === 502 || response.status === 503) && attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Lipat gandakan jeda waktu untuk percobaan berikutnya
                continue;
            }

            const data = await response.json();

            if (data.error) {
                return res.status(500).json({ error: data.error.message || 'Gemini API Error' });
            }

            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Gagal menghasilkan respons.';

            return res.status(200).json({ result: resultText });

        } catch (err) {
            if (attempt === maxRetries) {
                return res.status(500).json({ error: err.message });
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}