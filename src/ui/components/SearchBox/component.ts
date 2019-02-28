import Component, { tracked } from '@glimmer/component';
import KEY from '../../../utils/keycodes';
import { next } from '../../../utils/next';
import { setCursor } from '../../../utils/search';
import Token, { tokenize } from '../../../utils/token';

const NAVIGATIONAL_KEYS = [
  KEY.UP,
  KEY.DOWN,
  KEY.LEFT,
  KEY.RIGHT,
  KEY.HOME,
  KEY.END
];

function generateSpaceToken(): Token {
  return new Token('', ' ', null);
}

export default class SearchBox extends Component {
  @tracked public cursorLocation: number = -1;

  @tracked
  public get maxlength(): number {
    return this.args.maxlength || 250;
  }

  @tracked
  public get internalValue(): string {
    if (this.externalValueChanged && this.args.value !== this.localValue) {
      this.updateInternalValue(this.args.value);
    }
    return this.localValue;
  }

  @tracked public get externalValueChanged(): boolean {
    if (this.args.value === this.externalValueWas) { return false; }
    this.externalValueWas = this.args.value;
    return true;
  }

  @tracked get tokens(): Token[] {
    return tokenize(this.internalValue, this.args.tokenConfig);
  }

  @tracked get activeTokenIndex(): number {
    const cursorLocation = this.cursorLocation;
    let sumIndex: number = 0;
    let startIndex: number;
    let endIndex: number;
    let token: Token;
    const tokens = this.tokens;
    const tokenLength = tokens.length;
    for (let i = 0; i < length; i++) {
      token = tokens[i];
      startIndex = sumIndex;
      endIndex = token.length + startIndex;
      sumIndex = endIndex;
      if (startIndex < cursorLocation && cursorLocation <= endIndex) { return i; }
    }
    return -1;
  }

  @tracked get activeToken(): Token | null {
    const activeTokenIndex = this.activeTokenIndex;
    const tokens = this.tokens;
    let activeToken = null;
    if (activeTokenIndex > -1) {
      activeToken = tokens[activeTokenIndex];
    } else if (tokens.length === 0 && this.cursorLocation === 0) {
      activeToken = new Token('+', '', this.args.tokenConfig);
    }
    if (this.lastActiveToken !== activeToken) {
      if (this.lastActiveToken) { this.lastActiveToken.off('modelAssigned'); }
      if (activeToken) { activeToken.on('modelAssigned', this.onTokenModelAssigned); }
      if (this.args.onActiveTokenChanged) { this.args.onActiveTokenChanged(activeToken); }
      this.lastActiveToken = activeToken;
    }

    return activeToken;
  }

  @tracked public get hintValue(): string | null {
    if (this.isLastTokenSelected) { return this.activeToken && this.activeToken.hint; }
    return null;
  }

  @tracked public get isLastTokenSelected(): boolean {
    let tokensCount = this.tokens.length;
    return tokensCount > 0 && (tokensCount - 1) === this.activeTokenIndex;
  }

  @tracked public get isCursorAtEndOfInput(): boolean {
    return this.cursorLocation === this.internalValue.length;
  }

  @tracked public get backgroundText(): string {
    let text: string[] = [];
    this.tokens.forEach((token) => {
      const fullText = token.fullText;
      if (['default', 'modifier-list', 'space'].indexOf(token.type) >= 0) {
        text.push(fullText);
      } else if (token.isValueValid) {
        text.push(`<span class="search-box-hint">${fullText}</span>`);
      } else {
        text.push(`<span class="search-box-hint incomplete">${fullText}</span>`);
      }
    });
    text.push(`<span class="search-box-hint-value">${this.hintValue || ''}</span>`);
    return text.join('');
  }

  @tracked public get focused(): boolean { return this.internalFocused; }
  public set focused(value: boolean) {
    this.internalFocused = value;
    if (this.internalFocused) { this.mainInput.focus(); }
  }

  @tracked private localValue: string = '';
  @tracked private externalValueWas: string = '';

  @tracked private internalFocused: boolean = false;

  private lastActiveToken: Token;

  private mainInput: HTMLTextAreaElement;
  private background: Element;

  private mouseWheelListener: () => void;
  private onTokenModelAssigned: () => void;

  constructor(options: object) {
    super(options);
    this.onTokenModelAssigned = this.updateInputAfterChangingTokenModel.bind(this);
  }

  public didInsertElement() {
    const searchBox = this.bounds.firstNode as Element;
    this.mainInput = searchBox.querySelector('.search-box-input');
    this.background = searchBox.querySelector('.search-box-hints');
    this.mouseWheelListener = this.onMouseScroll.bind(this);
    this.mainInput.addEventListener('mousewheel', this.mouseWheelListener);
    this.mainInput.addEventListener('DOMMouseScroll', this.mouseWheelListener);

    if (this.focused) {
      next(() => {
        this.mainInput.select();
        this.mainInput.focus();
      });
    }
  }

  public willDestroy() {
    this.mainInput.removeEventListener('mousewheel', this.mouseWheelListener);
    this.mainInput.removeEventListener('DOMMouseScroll', this.mouseWheelListener);
  }

  public onMouseScroll() {
    this.scrollBackgroundToMatchInput();
  }

  public onKeyDown(e: KeyboardEvent) {
    const keyCode = e.keyCode;

    if (keyCode === KEY.ENTER) {
      e.preventDefault();
      if (this.args.onSearchTriggered) { this.args.onSearchTriggered(); }
    }

    if (keyCode === KEY.DOWN) {
      e.preventDefault();
      if (this.args.onDownPressed) { this.args.onDownPressed(); }
    }

    if (keyCode === KEY.ESCAPE) {
      if (this.args.onEscPressed) { this.args.onEscPressed(); }
    }

    // There are a number of keypress scenarios that will cause an input
    // field to scroll when the text exceeds the width of the field:
    //
    //   1. Pressing Home or End
    //   2. Pressing Cmd+Right (Mac) or Ctrl+Right (PC)
    //   3. Pasting in text that's longer than the field
    //   4. Typing at the end of the field
    //   5. Pressing and holding the Left or Right keys
    //
    // In these events, we need to update the position of .search-box-hints
    // to match the input field.
    //
    //
    //
    // It would, in theory, be ideal to call `scrollBackgroundToMatchInput`
    // on the keyUp event because, on keyDown, browsers have not yet scrolled
    // and redrawn the input field in response to the event.
    //
    // However, there are a number of scenarios where this will not work:
    //
    //   1. On the Mac, 'keyUp' events for (e.g. arrow keys or V for paste)
    //      are suppressed while the Command key is pressed.
    //
    //   2. When the user presses and holds a key down, the 'keyDown'
    //      event is fired repeatedly, but 'keyUp' events are not.
    //
    // In both of these cases, Firefox will still raise the 'keyPress'
    // event but other browsers will not.
    //
    //
    //
    // For this reason, we have to rely on `keyDown` to get the background
    // position of the element right; but it will do no good to call
    // `scrollBackgroundToMatchInput` immediately.
    //
    // We set two timeouts for calling this method: one without a delay
    // because this works for most browsers and gives a snappier feeling
    // and one with a short delay because, when the first timeout is
    // called, 9 times out of 10, Firefox for Mac has not yet redrawn
    // the input field.

    window.setTimeout(() => { this.scrollBackgroundToMatchInput(); });
    window.setTimeout(() => { this.scrollBackgroundToMatchInput(); }, 50);

    if (keyCode === KEY.TAB || keyCode === KEY.RIGHT || keyCode === KEY.END) {
      if (this.isCursorAtEndOfInput) {
        const activeToken = this.activeToken;
        if (activeToken && activeToken.autoComplete) {
          if (e.shiftKey) { return; } // Allow Shift+Tab to do its thing
          e.preventDefault();
          this.autocompleteOnTab(activeToken);
        }
      }
    }
  }

  public onKeyUp(e: KeyboardEvent) {
    const target = e.target as HTMLTextAreaElement;
    const keyCode = e.keyCode;
    if (NAVIGATIONAL_KEYS.indexOf(keyCode) > -1) {
      this.cursorLocation = target.selectionStart;
    }
  }

  public updateInputAfterChangingTokenModel() {
    const token = this.activeToken;
    if (!token) { return; }

    const tokens = this.tokens;

    if (tokens.length === 0) { tokens.push(token); }

    const isLastTokenSelected = (tokens.length - 1) === this.activeTokenIndex;
    if (token.isValueValid && isLastTokenSelected) {
      tokens.push(generateSpaceToken());
    }
    const cursorLocation = this.getTokenEndCursorPos(token) + (!token.isValueValid ? 0 : 1);

    this.updateInternalValue(this.tokensString);
    this.setCursor(cursorLocation);
  }

  public setCursor(newLocation: number) {
    this.cursorLocation = newLocation;
    next(() => {
      this.mainInput.focus();
      setCursor(this.mainInput, newLocation);
    });
  }

  public scrollBackgroundToMatchInput() {
    if (this.background && this.mainInput) {
      this.background.scrollLeft = this.mainInput.scrollLeft;
    }
  }

  public updateInternalValue(newValue: string) {
    this.localValue = newValue;
    if (this.args.onValueChanged) { this.args.onValueChanged(this.localValue); }
    next(() => {
      this.cursorLocation = this.mainInput ? this.mainInput.selectionStart : 0;
      this.scrollBackgroundToMatchInput();
    });
  }

  public changeInternalValue(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.updateInternalValue(target.value);
  }

  public didClick(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.cursorLocation = target.selectionStart;
    this.scrollBackgroundToMatchInput();
    if (this.args.onClick) { this.args.onClick(); }
  }

  public didReceiveFocus() {
    this.focused = true;

    // HACK: Needs to be run on the next iteration of the loop thanks to IE.
    // If it doesn't, then IE registers selectionStart as the end of the
    // _placeholder_ text, leading to an inability to discern an activeToken
    // and handle the null state gracefully.
    next(() => { this.cursorLocation = this.mainInput.selectionStart; });
    if (this.args.onFocus) { this.args.onFocus(); }
  }

  public didLoseFocus() {
    this.focused = false;

    // In Chrome (and Chrome only), when the input field loses focus,
    // Chrome scrolls the field all the way left. The other browsers
    // don't do this, but for Chrome's sake, we'll ensure that the
    // background span's position is synced with the input field's.
    next(() => { this.scrollBackgroundToMatchInput(); });
  }

  private autocompleteOnTab(activeToken: Token) {
    const hasVal = !!activeToken.value;
    const tokens = this.tokens;
    let cursorLocation = this.getTokenEndCursorPos(activeToken);
    if (hasVal) {
      if (this.isLastTokenSelected) {
        tokens.push(generateSpaceToken());
      }
      cursorLocation += 1;
    }

    this.updateInternalValue(this.tokensString);
    this.setCursor(cursorLocation);
  }

  private getTokenEndCursorPos(token: Token): number {
    let tokens = this.tokens;
    let sum = 0;
    for (let t of tokens) {
      sum += t.length;
      if (t === token) { break; }
    }
    return sum;
  }

  private get tokensString(): string {
    return this.tokens.reduce(function(sum: string, token: Token) {
      sum += token.fullText;
      return sum;
    }, '');
  }
}
