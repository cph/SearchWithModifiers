import Component, { tracked } from '@glimmer/component';
import { next } from '../../../utils/next';
import { Hint, Modifier, prepareConfig } from '../../../utils/search';
import { ConfigMap } from '../../../utils/search-context';
import Token from '../../../utils/token';

interface SectionHintsMap {
  [key: string]: Hint[];
}

export interface HintList {
  section: string;
  list: Hint[];
}

interface SampleQuery {
  query: string;
  label: string;
}

export default class SearchWithModifiers extends Component {
  @tracked private activeToken: Token;

  @tracked
  public get query(): string {
    return this.cachedQuery || this.args.query;
  }

  public set query(str: string) {
    this.cachedQuery = str;
  }

  @tracked
  public get tokenConfig(): ConfigMap {
    return prepareConfig(this.args.configHash);
  }

  @tracked
  public get showModifierList(): boolean {
    if (this.isHintListEmpty) { return false; }
    const type = this.activeToken && this.activeToken.type;
    return type && (type !== 'space');
  }

  @tracked
  public get hintList(): HintList[] {
    const token = this.activeToken;
    const hints = token && token.hints;
    if (!hints) { return []; }

    const limit = this.args.limit || 32;
    const hintsBySection: SectionHintsMap = hints.reduce(function(sum: SectionHintsMap, listItem: Hint) {
      let section = (listItem.hasOwnProperty('section') && (listItem as Modifier).section) || token.sectionTitle;
      if (sum[section]) {
        if (sum[section].length < limit) {
          sum[section].push(listItem);
        }
      } else {
        sum[section] = [listItem];
      }
      return sum;
    }, {});

    const sections = Object.keys(hintsBySection);

    let hintList = sections.map(function(section: string): HintList {
      let list = hintsBySection[section];
      if (sections.length > 1) { list = list.slice(0, 5); }
      return { list, section };
    });

    if (this.isQueryBlank) {
      const examples = this.sampleQueries;
      hintList = [{
        list: examples.map(function({ query, label }): Hint {
          return {
            label,
            modifier: true,
            searchOnEnter: true,
            section: 'How to Search',
            value: query
          };
        }),
        section: 'How to Search'
      }].concat(hintList);
    }

    return hintList;
  }

  private sampleQueries: SampleQuery[] = [];

  @tracked private cachedQuery: string = '';
  @tracked private lastQuery: string = '';

  @tracked
  private get isQueryBlank(): boolean {
    return !this.query;
  }

  private get isHintListEmpty(): boolean {
    return this.hintList.length === 0;
  }

  private didSelectModifier(model: Modifier) {
    const token = this.activeToken;
    next(() => {
      token.model = model;
      if (model.searchOnEnter) {
        next(() => {
          this.performSearch();
        });
      }
    });
  }

  private valueDidChange(newValue: string) {
    this.query = newValue;
  }

  private updateActiveToken(newToken: Token) {
    this.activeToken = newToken;
  }

  private performSearch() {
    this.lastQuery = this.query;
    // TODO: How should we run search??
  }
}
