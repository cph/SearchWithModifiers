import { tracked } from '@glimmer/component';
import { Hint } from '../utils/search';

export interface RawModifier {
  hint: string;
  modifier: string;
  title: string;
  values: Hint[];
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

export default class SearchContext {
  @tracked public modifiers: [RawModifier];
  @tracked public scope: string;

  public get queryScope(): string { return this.scope; }

  public get config(): ConfigMap {
    let config: ConfigMap = {};
    this.modifiers.forEach(({ modifier, hint, title, values }) => {
      if (modifier !== '#') { modifier = `${modifier}:`; }
      config[modifier] = {
        content: values,
        defaultHint: hint,
        sectionTitle: title,
        type: 'list'
      };
    });
    return config;
  }
}
