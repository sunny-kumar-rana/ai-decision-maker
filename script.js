const optionsDiv = document.getElementById("options");
const loader = document.getElementById("loader");

document.getElementById("addBtn").onclick = () => {
  const input = document.createElement("input");
  input.placeholder = "Option...";
  optionsDiv.appendChild(input);
};

function extractOptions() {
  const text = document.getElementById("nlInput").value;
  const parts = text.split(" or ");
  optionsDiv.innerHTML = "";
  parts.forEach(p => {
    const input = document.createElement("input");
    input.value = p.replace(/should i/i, "").trim();
    optionsDiv.appendChild(input);
  });
}

function getFactors() {
  return {
    cost: +cost.value,
    time: +time.value,
    effort: +effort.value,
    fun: +fun.value,
    risk: +risk.value
  };
}

/* Improved RULES */
const RULES = {
  sandwich: { cost: 3, effort: 2, fun: 5, risk: 2, time: 3 },
  omelet: { cost: 2, effort: 3, fun: 4, risk: 2, time: 4 },
  biryani: { cost: 7, effort: 6, fun: 8, risk: 4, time: 6 }
};

function features(option) {
  const o = option.toLowerCase();

  for (let key in RULES) {
    if (o.includes(key)) return RULES[key];
  }

  // fallback generic values
  return {
    cost: 5,
    effort: 5,
    fun: 5,
    risk: 3,
    time: 5
  };
}

function computeScore(option, w) {
  const f = features(option);

  let score =
    (10 - f.cost) * w.cost +
    (10 - f.time) * w.time +
    (10 - f.effort) * w.effort +
    (f.fun) * w.fun +
    (10 - f.risk) * w.risk;

  const maxScore =
    10*w.cost + 10*w.time + 10*w.effort + 10*w.fun + 10*w.risk;

  score = (score / maxScore) * 100;

  // slight variation to avoid ties
  score += Math.random() * 2;

  return score;
}

function applyConstraints(options, limits) {
  return options.filter(o => {
    const f = features(o);
    if (limits.maxCost && f.cost > limits.maxCost) return false;
    if (limits.maxTime && f.time > limits.maxTime) return false;
    return true;
  });
}

function fallbackExplanation(scored) {
  return `${scored[0].option} is best due to better balance of cost, effort, and fun.`;
}

async function getAIExplanation(options, context, scored) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Explain decisions clearly." },
          {
            role: "user",
            content: `Options: ${options.join(", ")}
Context: ${context}
Scores: ${scored.map(s => s.option + ":" + s.score.toFixed(1)).join(", ")}

Explain briefly.`
          }
        ]
      })
    });

    const data = await res.json();
    return data.choices[0].message.content;

  } catch {
    return fallbackExplanation(scored);
  }
}

async function decide() {
  let options = Array.from(document.querySelectorAll("#options input"))
    .map(i => i.value)
    .filter(Boolean);

  if (options.length < 2) return alert("Add options");

  const mode = document.getElementById("mode").value;
  const weights = getFactors();

  const limits = {
    maxCost: +maxCost.value || null,
    maxTime: +maxTime.value || null
  };

  options = applyConstraints(options, limits);

  let scored = options.map(o => ({
    option: o,
    score: computeScore(o, weights)
  })).sort((a, b) => b.score - a.score);

  let explanation;

  loader.classList.remove("hidden");

  if (mode === "Quick") {
    explanation = fallbackExplanation(scored);
  } else if (mode === "Random") {
    const pick = options[Math.floor(Math.random() * options.length)];
    scored = [{ option: pick, score: 100 }];
    explanation = "Random selection mode.";
  } else {
    explanation = await getAIExplanation(options, context.value, scored);
  }

  loader.classList.add("hidden");

  showResult(scored, explanation);
}

function showResult(scored, explanation) {
  const resultDiv = document.getElementById("result");

  const conf = scored.length > 1
    ? Math.min(100, Math.round(scored[0].score - scored[1].score))
    : 100;

  resultDiv.innerHTML = `
    <div class="card">
      <h2>Best: ${scored[0].option}</h2>
      <p>Confidence: ${conf}%</p>
      <p>${explanation}</p>
    </div>

    ${scored.map((s, i) => `
      <div class="option-card ${i === 0 ? 'best' : ''}">
        <b>${i + 1}. ${s.option}</b> (${s.score.toFixed(1)})
        <div class="bar" style="width:${s.score}%"></div>
      </div>
    `).join("")}
  `;

  saveHistory(scored[0].option);
}

function simulate(type) {
  if (type === "money") cost.value = 1;
  if (type === "time") time.value = 1;
  decide();
}

function saveHistory(choice) {
  let h = JSON.parse(localStorage.getItem("h")) || [];
  h.push(choice);
  localStorage.setItem("h", JSON.stringify(h));
  renderHistory();
}

function renderHistory() {
  let h = JSON.parse(localStorage.getItem("h")) || [];
  document.getElementById("history").innerHTML =
    h.map(x => `<p>${x}</p>`).join("");
}

renderHistory();