import Component, { tracked } from '@glimmer/component';
import KEY from '../../../utils/keycodes';
import { next } from '../../../utils/next';
import { scrollIntoView, scrollToBottom, scrollToTop } from '../../../utils/scroll-helpers';

export default class ListKeyboardNavigator extends Component {

  public get tabIndex(): number {
    return this.args.tabIndex || 0;
  }

  public get selectedItem(): object {
    if (this.args.selectedItem !== this.selectedItemWas) {
      next(() => { this.highlightSelectedItem(); });
      this.selectedItemWas = this.args.selectedItem;
    }
    return this.args.selectedItem;
  }

  public get itemSelector(): string {
    return this.args.itemSelector || 'li';
  }

  public get highlightFromSelection(): boolean {
    return this.args.highlightFromSelection || false;
  }

  public get selectImmediately(): boolean {
    return this.args.selectImmediately || false;
  }

  public get highlightOnMouseOver(): boolean {
    return !this.selectImmediately;
  }

  public get focused(): boolean {
    return this._focused;
  }
  public set focused(value: boolean) {
    if (value !== this._focused && this.args.onChangeFocus) { this.args.onChangeFocus(value); }
    this._focused = value;
    if (this._focused) { this.acquireFocus(); }
  }

  public get items(): object[] {
    if (this.args.items && this.args.items.length !== this.itemCountWas) {
      this.reset();
      this.itemCountWas = this.args.items.length;
    }
    return this.args.items || [];
  }

  public get highlightedIndex(): number {
    const index = this.highlightedItemIndex;
    if (!this.highlightFromSelection) { return index; }
    return index < 0 ? this.selectedItemIndex : index;
  }

  public get highlightedItem(): object {
    let index = this.highlightedIndex;
    if (index < 0 || this.items.length === 0) { return null; }
    if (index >= this.items.length) { index = index % this.items.length; }
    return this.items[index];
  }

  public get selectedItemIndex(): number {
    if (!this.selectedItem) { return -1; }
    return this.items.indexOf(this.selectedItem);
  }

  @tracked private itemCountWas: number = 0;
  @tracked private selectedItemWas: object = null;
  @tracked private highlightedItemIndex: number = -1;
  @tracked private highlightedBy: string = null;
  @tracked private _focused = false;

  private mouseOverHandler: (...args: any[]) => any;
  private mouseLeaveHandler: (...args: any[]) => any;
  private keyDownHandler: (...args: any[]) => any;

  public didInsertElement() {
    this.reset();
    this.mouseOverHandler = this.onMouseOverItem.bind(this);
    this.mouseLeaveHandler = this.onMouseLeave.bind(this);
    this.keyDownHandler = this.onKeyDown.bind(this);
    (this.bounds.firstNode as HTMLElement).addEventListener('mouseover', this.mouseOverHandler);
    (this.bounds.firstNode as HTMLElement).addEventListener('mouseleave', this.mouseLeaveHandler);
    (this.bounds.firstNode as HTMLElement).addEventListener('keydown', this.keyDownHandler);
  }

  public willDestroy() {
    (this.bounds.firstNode as HTMLElement).removeEventListener('mouseover', this.mouseOverHandler);
    (this.bounds.firstNode as HTMLElement).removeEventListener('mouseleave', this.mouseLeaveHandler);
    (this.bounds.firstNode as HTMLElement).removeEventListener('keydown', this.keyDownHandler);
  }

  public select() {
    const item = this.highlightedItem;
    if (item && this.args.onItemSelected) { this.args.onItemSelected(item); }
  }

  public onMouseOverItem(e: MouseEvent) {
    if (!this.highlightOnMouseOver) { return; }
    const target = e.target as HTMLElement;
    const item = target.closest(this.itemSelector);
    const items = this.findAll(this.itemSelector);
    let index = Array.from(items).indexOf(item);
    this.updateHighlightIndex(index, 'mouse');
  }

  public onMouseLeave(e: MouseEvent) {
    if (!this.highlightOnMouseOver) { return; }
    this.updateHighlightIndex(-1, 'mouse');
  }

  public onKeyDown(e: KeyboardEvent) {
    const { altKey, ctrlKey, metaKey, shiftKey, keyCode } = e;
    if (altKey || ctrlKey || metaKey || shiftKey) { return; }
    if (e.defaultPrevented) { return; }

    if (keyCode >= KEY.ZERO && keyCode <= KEY.Z ||
        keyCode >= KEY.NUMPAD_ZERO && keyCode <= KEY.NUMPAD_NINE ||
        keyCode === KEY.BACKSPACE) {
      if (this.args.onTyping) { this.args.onTyping(); }
    }

    switch (keyCode) {
      case KEY.DOWN:
        e.preventDefault();
        this.downPressed();
        break;
      case KEY.UP:
        e.preventDefault();
        this.upPressed();
        break;
      case KEY.ENTER:
        if (this.highlightedBy !== 'keyboard') { break; }
        if (this.highlightedItem && this.highlightedItem !== this.selectedItem) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.enterPressed();
        }
        break;
    }
  }

  private find(selector: string): HTMLElement {
    return (this.bounds.firstNode as Element).querySelector(selector) as HTMLElement;
  }

  private findAll(selector: string): NodeList {
    return (this.bounds.firstNode as Element).querySelectorAll(selector);
  }

  private reset() {
    this.resetHighlight();
    next(() => { this.scrollToSelectedItem(); });
  }

  private downPressed() {
    const itemsLength = this.items.length;
    if (this.highlightedIndex === itemsLength - 1) {
      if (this.args.onHitBottom) { this.args.onHitBottom(); }
      return;
    }
    if (itemsLength === 0) { return; }
    const index = Math.min(this.highlightedIndex + 1, itemsLength - 1);
    this.updateHighlightIndex(index, 'keyboard');
  }

  private upPressed() {
    if (this.highlightedIndex <= 0) {
      if (this.args.onHitTop) {
        this.updateHighlightIndex(-1, 'keyboard');
        this.args.onHitTop();
      }
      return;
    }
    if (this.items.length === 0) { return; }
    const index = Math.max(0, this.highlightedIndex - 1);
    this.updateHighlightIndex(index, 'keyboard');
  }

  private enterPressed() {
    this.select();
  }

  private acquireFocus() {
    // Safari will scroll to the top of the div and cancel any click events if
    // we focus on the keyboard navigator when it or a child is already in focus
    const rootEl = (this.bounds.firstNode as HTMLElement);
    const alreadyFocused = rootEl === document.activeElement || rootEl.contains(document.activeElement);
    if (!alreadyFocused) {
      rootEl.focus();
      // Simulating a keypress is hard. Can we just call downPressed?
      this.downPressed();
    }
  }

  private scrollToHighlightedItem() {
    if (this.highlightedBy === 'mouse') { return; }
    if (this.highlightedIndex < 0) { return; }

    const el = this.find(`${this.itemSelector}:nth-child(${this.highlightedIndex + 1})`);
    if (this.highlightedIndex === 0) {
      scrollToTop(el);
    } else if (this.highlightedIndex === (this.items.length - 1)) {
      scrollToBottom(el);
    } else {
      scrollIntoView(el);
    }
  }

  private scrollToSelectedItem() {
    const index = this.selectedItemIndex;
    if (index < 0) { return; }
    const el = this.find(`${this.itemSelector}:nth-child(${index + 1})`);
    if (el) { scrollIntoView(el); }
  }

  private resetHighlight() {
    this.updateHighlightIndex(-1);
  }

  private highlightSelectedItem() {
    this.updateHighlightIndex(this.selectedItemIndex, null, true);
  }

  private updateHighlightIndex(index: number, highlightedBy?: string, ignoreSelectImmediately: boolean = false) {
    if (this.highlightedItemIndex === index) { return; }
    this.highlightedBy = highlightedBy || null;
    this.highlightedItemIndex = index;
    if (this.args.onItemHighlighted) { this.args.onItemHighlighted(this.highlightedItem); }
    if (!ignoreSelectImmediately && this.selectImmediately) { this.select(); }
    next(() => { this.scrollToHighlightedItem(); });
  }
}
