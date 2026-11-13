/**
 * Calcula la Distancia de Levenshtein entre dos cadenas de texto.
 * Mide el número mínimo de operaciones (inserciones, eliminaciones o sustituciones)
 * necesarias para transformar una cadena en otra.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();

  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Matriz de distancias
  const matrix: number[][] = [];

  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // Eliminación
        matrix[i][j - 1] + 1,       // Inserción
        matrix[i - 1][j - 1] + cost // Sustitución
      );
    }
  }

  return matrix[m][n];
}

/**
 * Normaliza una cadena eliminando tildes, signos de puntuación y espacios extras.
 */
export function normalizeSpanishText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9\s]/g, ' ')     // Elimina puntuación
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula el ratio de similitud entre 0.0 y 1.0 (1.0 = idénticos)
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeSpanishText(a);
  const normB = normalizeSpanishText(b);
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(normA, normB);
  return 1.0 - distance / maxLen;
}

/**
 * Verifica si un nombre de alumno fue pronunciado en el texto detectado,
 * permitiendo tolerancia fonética mediante Levenshtein.
 */
export function fuzzyMatchName(spokenText: string, studentFullName: string, maxDistance: number = 2): boolean {
  const normSpoken = normalizeSpanishText(spokenText);
  const normStudent = normalizeSpanishText(studentFullName);

  // Coincidencia exacta o contenida directa
  if (normSpoken.includes(normStudent)) return true;

  // Comparar con cada sub-frase o palabras
  const studentWords = normStudent.split(' ');
  const spokenWords = normSpoken.split(' ');

  // Si el estudiante tiene nombre y apellido (ej: "Juan Pérez")
  if (studentWords.length >= 2) {
    const firstName = studentWords[0];
    const lastName = studentWords[1];

    // Buscar ventanas de 2 palabras en el texto hablado
    for (let i = 0; i < spokenWords.length - 1; i++) {
      const windowPhrase = `${spokenWords[i]} ${spokenWords[i + 1]}`;
      if (levenshteinDistance(windowPhrase, `${firstName} ${lastName}`) <= maxDistance) {
        return true;
      }
    }
  }

  // Comparar nombre individual con tolerancia
  for (const word of spokenWords) {
    for (const sWord of studentWords) {
      if (sWord.length >= 4 && levenshteinDistance(word, sWord) <= 1) {
        return true;
      }
    }
  }

  return false;
}
