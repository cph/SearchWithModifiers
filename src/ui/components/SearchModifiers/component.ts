import Component, { tracked } from '@glimmer/component';
import { next } from '../../../utils/next';
import { HintList, Modifier } from '../../../utils/types';

interface DisplayHint {
  category: string;
  index: number;
  label: string;
  position: number;
  value: string;
}

interface DisplayHintList {
  section: string;
  list: DisplayHint[];
}

export default class SearchModifiers extends Component {

  @tracked public focused: boolean = false;

  @tracked
  public get currentIndex(): number { return this._currentIndex; }
  public set currentIndex(value: number) {
    if (value !== this.currentIndexWas) {
      next(() => { this.correctScroll(); });
    }
    this._currentIndex = value;
  }

  @tracked
  public get hintList(): DisplayHintList[] {
    if (this.args.hintList.length !== this.hintListLengthWas) {
      this.hintListLengthWas = this.args.hintList.length;
      this.currentIndex = -1;
    }
    let index = 0;
    return (this.args.hintList || []).map((section: HintList) => {
      return {
        list: section.list.map((listItem: Modifier) => {
          index += 1;
          return {
            category: section.section,
            index,
            label: listItem.label,
            position: index,
            value: listItem.value
          };
        }),
        section: section.section
      };
    });
  }

  @tracked
  public get flatList(): DisplayHint[] {
    return this.hintList.reduce((list: DisplayHint[], item: DisplayHintList): DisplayHint[] => {
      return list.concat(item.list);
    }, []);
  }

  @tracked private hintListLengthWas = 0;
  @tracked private _currentIndex = -1;
  private currentIndexWas = -1;

  public didInsertElement() {
    if (this.focused) {
      const rootEl = (this.bounds.firstNode as HTMLElement);
      const keyboardNavigator = rootEl.querySelector('.list-keyboard-navigator') as HTMLElement;
      if (keyboardNavigator) { keyboardNavigator.focus(); }
    }
  }

  public correctScroll() {
    const rootEl = this.bounds.firstNode as HTMLElement;
    if (this.currentIndex === -1) { return; }
    const listItem = rootEl.querySelector(`div.search-modifier:nth-child(${this.currentIndex + 1})`) as HTMLElement;
    const list = listItem.parentElement as HTMLElement;
    const scroll = list.scrollTop;
    const listHeight = list.scrollHeight;
    const itemHeight = listItem.scrollHeight;
    const top = listItem.offsetTop - scroll; // I think this is equal to jQuery's $(el).position().top
    const bottom = top + itemHeight;
    if (top < 0) {
      list.scrollTo(list.scrollLeft, Math.max(scroll + top - 8));
    } else if (listHeight < bottom) {
      list.scrollTo(list.scrollLeft, scroll + top - listHeight + itemHeight);
    }
  }

  public select() {
    if (this.currentIndex === -1) { return; }
    const item = this.flatList[this.currentIndex];
    if (this.args.onSelect) { this.args.onSelect(item); }
  }

  public selectItem(index: number) {
    this.currentIndex = index;
    this.select();
  }

  public didPressEnterOnNode(node: any) {
    this.currentIndex = node.index;
    this.select();
  }

  public didHighlightNode(node: any) {
    if (!node) { return; }
    const hint = this.flatList[node.index];
    if (hint && this.args.onHighlightHint) { this.args.onHighlightHint(hint); }
  }

  public didChangeFocus(focused: boolean) {
    this.focused = focused;
  }
}
