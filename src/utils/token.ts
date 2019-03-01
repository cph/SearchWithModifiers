import { tracked } from '@glimmer/component';
import Eventable from './eventable';
import ListSource from './list-source';
import { normalized, unquoted } from './search';
import { ConfigMap, Hint, Modifier, SearchContextConfig } from './types';

export default class Token extends Eventable {
  @tracked public modifier: string = '';
  @tracked public value: string = '';
  @tracked private configMap: ConfigMap = {};

  public get config(): SearchContextConfig | null {
    if (this.modifier) {
      return this.configMap[this.modifier.toLowerCase()];
    } else if (this.value && this.value !== ' ') {
      return this.configMap._default;
    }
    return null;
  }

  public get type(): string {
    return (this.config && this.config.type) || 'space';
  }

  public get sectionTitle(): string {
    return this.config.sectionTitle;
  }

  public get content(): Hint[] {
    return this.config.content;
  }

  public get fullText(): string {
    return `${this.modifier}${this.value}`;
  }

  public set fullText(value) {
    const configs = this.config;
    if (configs) {
      let modifier: string;
      if (value.substr(0, 1) === '+') {
        modifier = '+';
      } else {
        for (let k in configs) {
          if (value.substr(0, k.length) === k) {
            modifier = k;
            break;
          }
        }
      }
      if (modifier) {
        value = value.substr(modifier.length);
        this.modifier = modifier;
        this.value = value;
      } else if (value) {
        this.value = value;
      }
    }
  }

  public get length(): number {
    return this.fullText.length;
  }

  public get firstHint(): Hint {
    let value = this.normalizedValue;
    return this.hints.find((hint) => {
      return value.length === 0 || normalized(ListSource.serialize(hint)).indexOf(value) === 0;
    });
  }

  public get subHint(): string | null {
    if (this.isValueValid && this.value.match(/"$/)) { return null; }
    const value = this.value.toLocaleLowerCase();
    if (value.length === 0) { return null; }
    const firstHint = this.firstHint;
    if (firstHint === undefined) { return null; }
    const hint: string = typeof firstHint === 'string' ? firstHint : ListSource.serialize(firstHint);
    if (normalized(hint).indexOf(normalized(value)) === 0) {
      return unquoted(hint).substr(normalized(value).length);
    }
    return null;
  }

  public get hint(): string | null {
    return this.value.length > 0 ? this.subHint : this.config.defaultHint;
  }

  public get hints(): Hint[] {
    const content = this.content;
    return content ? ListSource.getHints(this.value, content) : [];
  }

  public get model(): Hint | null {
    if (this.isValueValid) {
      return ListSource.deserialize(this.normalizedValue, this.content);
    } else {
      return null;
    }
  }

  public set model(newModel: Hint) {
    const val = ListSource.serialize(newModel);
    if (typeof newModel === 'string') {
      this.value = val;
      this.trigger('modelAssigned');
      return;
    }
    newModel = newModel as Modifier;
    if (newModel.fullText || newModel.modifier) {
      this.fullText = val;
    } else {
      this.value = val;
    }
    this.trigger('modelAssigned');
  }

  public get normalizedValue(): string {
    return normalized(this.value);
  }

  public get isValueValid() {
    return ListSource.validate(this.value, this.content);
  }

  constructor(modifier: string, value: string, configMap: ConfigMap) {
    super();
    this.modifier = modifier;
    this.value = value;
    this.configMap = configMap;
  }

  public autoComplete(): boolean {
    const hint = this.firstHint;
    const subHint = this.subHint;

    if (hint && subHint) {
      const hintValue = typeof hint === 'string' ? (hint as string) : (hint as Modifier).value;
      if (typeof hint !== 'string' && (hint as Modifier).modifier) {
        this.fullText = hintValue;
      } else {
        this.value = hintValue;
      }
      return true;
    }
    return false;
  }
}

export function tokenize(text: string, configMap: ConfigMap): Token[] {
  if (!text) { return []; }

  let tokens: Token[] = [];
  let value = '';
  let modifier = '';
  let mode = 'default';

  for (let i = 0; i <= text.length; i++) {
    let character = text[i];

    if (!character) {
      if (modifier !== '' || value.length > 0) {
        tokens.push(new Token(modifier, value, configMap));
      }
      return tokens;
    }

    switch (mode) {
      case 'default':
        if (character === '"') { mode = 'in-quote'; }

        if (modifier !== '') {
          if (character === ' ' && (/[^ ]/.test(value) || modifier === '#')) {
            tokens.push(new Token(modifier, value, configMap));
            modifier = '';
            value = '';
            mode = 'whitespace';
          }
          value += character;
        } else {
          if (character === ' ') {
            if (value.length > 0) {
              tokens.push(new Token(modifier, value, configMap));
              modifier = '';
              value = '';
            }
            mode = 'whitespace';
          }
          value += character;

          if (configMap[value.toLowerCase()] !== undefined) {
            modifier = value;
            value = '';
          }
        }
        break;

      case 'whitespace':
        if (character !== ' ') {
          if (modifier !== '' || value.length > 0) {
            tokens.push(new Token(modifier, value, configMap));
            modifier = '';
            value = '';
          }
          mode = 'default';
        }

        value += character;
        break;

      case 'in-quote':
        if (character === '"') { mode = 'default'; }
        value += character;
        break;
    }
  }
}
