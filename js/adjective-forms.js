const I_EXCEPT = new Set(['いい', '良い']);

export function adjectiveForm(jp, type, form) {
  if (type === 'i') {
    if (I_EXCEPT.has(jp)) {
      // base よ
      const stem = 'よ';
      switch (form) {
        case 'negative': return stem + 'くない';
        case 'past': return stem + 'かった';
        case 'negative_past': return stem + 'くなかった';
      }
      throw new Error(`Forma desconocida ${form} para i-adj excepción`);
    }
    // i-adj normal: quitar い final, añadir sufijo
    if (!jp.endsWith('い')) throw new Error(`i-adj no termina en い: ${jp}`);
    const stem = jp.slice(0, -1);
    switch (form) {
      case 'negative': return stem + 'くない';
      case 'past': return stem + 'かった';
      case 'negative_past': return stem + 'くなかった';
    }
    throw new Error(`Forma desconocida ${form} para i-adj`);
  }
  if (type === 'na') {
    switch (form) {
      case 'negative': return jp + 'じゃない';
      case 'past': return jp + 'だった';
      case 'negative_past': return jp + 'じゃなかった';
      case 'noun_form': return jp + 'な';
    }
    throw new Error(`Forma desconocida ${form} para na-adj`);
  }
  throw new Error(`Tipo desconocido: ${type}`);
}

export function generateAdjDistractors(jp, type, form, n = 3) {
  const correct = adjectiveForm(jp, type, form);
  const candidates = new Set();

  // 1. Aplicar reglas del otro tipo
  try {
    const wrong = type === 'i' ? 'na' : 'i';
    if (wrong === 'i' && jp.endsWith('い')) {
      candidates.add(adjectiveForm(jp, 'i', form === 'noun_form' ? 'negative' : form));
    } else if (wrong === 'na' && !I_EXCEPT.has(jp)) {
      // tratar el i-adj como na-adj (incorrecto)
      const naForm = form === 'noun_form' ? 'negative' : form;
      candidates.add(adjectiveForm(jp, 'na', naForm));
    }
  } catch (_) {}

  // 2. Cambiar el sufijo a otro de la misma familia
  if (type === 'i') {
    const stem = I_EXCEPT.has(jp) ? 'よ' : jp.slice(0, -1);
    const alts = ['くなかった', 'かった', 'くない', 'い'];
    for (const a of alts) {
      if (candidates.size >= n + 3) break;
      candidates.add(stem + a);
    }
  } else {
    const alts = ['じゃなかった', 'だった', 'じゃない', 'な', 'です'];
    for (const a of alts) {
      if (candidates.size >= n + 3) break;
      candidates.add(jp + a);
    }
  }

  candidates.delete(correct);
  return [...candidates].slice(0, n);
}
