export interface Modifier {
  fullText?: boolean;
  label?: string;
  modifier?: boolean;
  searchOnEnter?: boolean;
  section?: string;
  value: string;
}

export type Hint = string | Modifier;

export interface HintList {
  section: string;
  list: Hint[];
}

export interface SearchContextConfig {
  content: Hint[];
  defaultHint?: string;
  sectionTitle?: string;
  type: string;
}

export interface ConfigMap {
  [index: string]: SearchContextConfig;
}
