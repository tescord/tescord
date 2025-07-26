// Regex: Parantez içindeki içeriği ve sonrasındaki opsiyonel '?' işaretini yakalar
// Grup 1: Parantez içindeki içerik (örn: "set|unset" veya "user|admin")
// Grup 2: Opsiyonel '?' işareti (varsa '?')
const regex = /\(([^)]+)\)(\??)/;

/**
 * Verilen kalıp string'inden olası tüm kombinasyonları üretir.
 * Desteklenen Kalıplar:
 * - (seçenek1|seçenek2|...): Parantez içindeki seçeneklerden birini seçer.
 * - (grup)?: Parantez içindeki grubun varlığını veya yokluğunu ifade eder.
 *            Bu, grup içindeki tüm seçeneklerin opsiyonel olduğu anlamına gelir
 *            ve grubun tamamen atlandığı bir kombinasyon ekler.
 *
 * @param pattern Kombinasyonları üretilecek kalıp string'i.
 * @returns Üretilen tüm kombinasyonların string dizisi.
 */
export function generateCombinations(pattern: string): string[] {
  const results = new Set<string>(); // Tekrarları önlemek için Set kullanalım
  const queue: string[] = [pattern]; // İşlenecek string'ler için kuyruk

  while (queue.length > 0) {
    const currentPattern = queue.shift()!; // Kuyruktan ilk elemanı al (non-null assertion)
    const match = currentPattern.match(regex);

    if (!match) {
      // İşlenecek başka kalıp yoksa, sonucu ekle (boşlukları düzenle)
      results.add(currentPattern.replace(/\s+/g, " ").trim());
      continue;
    }

    const before: string = currentPattern.substring(0, match.index);
    const optionsString: string = match[1]; // "set|unset" veya "user|admin"
    const isOptional: boolean = match[2] === "?"; // Grup opsiyonel mi? (true/false)
    // Eşleşen kalıbın tamamının uzunluğu (örn: "(set|unset)".length veya "(user|admin)?".length)
    const matchLength: number = match[0].length;
    const after: string = currentPattern.substring(match.index! + matchLength); // Use non-null assertion for match.index

    const options: string[] = optionsString.split("|"); // Seçenekleri ayır: ["set", "unset"]

    // Her bir seçenek için yeni string oluştur ve kuyruğa ekle
    options.forEach((option: string) => {
      const nextPattern: string = `${before}${option}${after}`;
      queue.push(nextPattern);
    });

    // Eğer grup opsiyonel ise ('?' varsa), grubun olmadığı durumu da kuyruğa ekle
    if (isOptional) {
      const nextPatternWithoutGroup: string = `${before}${after}`;
      queue.push(nextPatternWithoutGroup);
    }
  }

  return Array.from(results); // Set'i diziye çevirerek döndür
}

// --- Örnek Kullanımlar ---

// 1. Temel Örnek
// const pattern1: string = "welcome (set|unset) (join|leave)";
// ["welcome set join", "welcome set leave", "welcome unset join", "welcome unset leave", "welcome join", "welcome leave"]
// const combinations1: string[] = generateCombinations(pattern1);
// const combinations2: string[] = generateCombinations(pattern1);
// console.log(`Kalıp: "${pattern1}"`);
// console.log("Kombinasyonlar1:", combinations1);
// console.log("Kombinasyonlar2:", combinations2);