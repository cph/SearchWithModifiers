import { tracked } from '@glimmer/component';
import { ConfigMap, Hint } from './types';

interface RawModifier {
  hint: string;
  modifier: string;
  title: string;
  values: Hint[];
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
