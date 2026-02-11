// carrega variáveis de ambiente do arquivo .env // chave gpt
require('dotenv').config();
console.log("🔑 Sua chave carregada:", process.env.OPENAI_API_KEY ? "OK" : "NÃO ENCONTRADA");

const express = require('express'); // server
const path = require('path');       // manipula caminhos de arquivos
const fetch = require('node-fetch'); // pra chamar API externa

const app = express();
app.use(express.json()); // aceita JSON no body
app.use(express.static(path.join(__dirname, 'public'))); // serve arquivos estáticos

const OPENAI_KEY = process.env.OPENAI_API_KEY || ''; // pega chave da OpenAI

// rota pra chat
app.post('/api/chat', async (req, res) => {
  const { message, symptoms, userName } = req.body || {}; // pega mensagem, sintomas e nome
  const prompt = `Você é Luna, uma assistente feminina, acolhedora e educativa sobre ciclo menstrual. 
Converse como uma amiga, explique causas simples para sintomas e entregue dicas práticas e curtas.

Usuária: ${userName || "Anônima"}
Disse: "${message}"
Sintomas: ${JSON.stringify(symptoms)}

Responda apenas com um texto de resposta, de forma breve e acolhedora.`;

  // se não tiver chave, responde mensagem pre programada 
  if (!OPENAI_KEY) {
    const simulated = `Entendi: "${message}". Uma dica rápida: cuide do seu descanso e hidratação. Se a cólica estiver forte, um banho morno e analgésico (se você costuma tomar) pode ajudar. 🌸`;
    const detectedPhase = (message || '').toLowerCase().includes('ovula') ? 'Ovulação' : null;
    return res.json({ reply: simulated, detectedPhase });
  }

  // se tiver chave, chama a OpenAI 
  try {
    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é Luna, assistente feminina, acolhedora e informativa.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,     // tamanho da resposta
      temperature: 0.8     // criatividade
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) { // se deu ruim
      const text = await r.text();
      console.error('OpenAI error', r.status, text);
      return res.status(502).json({ error: 'Erro na API de IA', details: text });
    }

    const json = await r.json();
    const reply = json.choices?.[0]?.message?.content?.trim() || 'Desculpa, não obtive resposta.';
    const match = reply.match(/(Folicular|Ovulação|Lútea|Menstruação)/i); // tenta detectar fase do ciclo
    const detectedPhase = match ? match[0] : null;
    return res.json({ reply, detectedPhase });
''
  } catch (err) { // erro inesperado
    console.error('Erro ao chamar IA:', err);
    return res.status(500).json({ error: 'Erro interno ao chamar IA' });
  }
});

// escolhe porta e sobe server
const PORT = process.env.PORT || 3001; // deixei 3000 para bater com index.html
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
