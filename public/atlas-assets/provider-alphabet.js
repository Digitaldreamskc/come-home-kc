export const providerLetters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];

export function providerInitial(name) {
  const letter = name.trim().normalize('NFD')[0]?.toUpperCase() ?? '';
  return /^[A-Z]$/.test(letter) ? letter : '#';
}

export function providerAlphabet(records, preferred, searching = false) {
  const available = new Set(records.map(record => providerInitial(record.name)));
  const active = preferred === 'All' || available.has(preferred) ? preferred :
    searching ? 'All' : providerLetters.find(letter => available.has(letter)) ?? 'All';
  return { available, active };
}
