declare module '@/public/atlas-assets/provider-alphabet.js' {
  export const providerLetters: string[];
  export function providerInitial(name: string): string;
  export function providerAlphabet(
    records: readonly {name: string}[], preferred: string, searching?: boolean,
  ): {available: Set<string>; active: string};
}
