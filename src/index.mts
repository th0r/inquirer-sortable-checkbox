import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  usePagination,
  useRef,
  useMemo,
  makeTheme,
  isUpKey,
  isDownKey,
  isSpaceKey,
  isNumberKey,
  isEnterKey,
  ValidationError,
  type Theme,
  KeypressEvent,
} from '@inquirer/core';
import type { PartialDeep } from '@inquirer/type';
import chalk from 'chalk';
import figures from '@inquirer/figures';
import ansiEscapes from 'ansi-escapes';

type SortableCheckboxTheme = {
  icon: {
    checked: string;
    unchecked: string;
    cursor: string;
  };
  style: {
    disabledChoice: (text: string) => string;
    renderSelectedChoices: <T>(
      selectedChoices: ReadonlyArray<Choice<T>>,
      allChoices: ReadonlyArray<Choice<T>>,
    ) => string;
  };
  helpMode: 'always' | 'never' | 'auto';
};

const checkboxTheme: SortableCheckboxTheme = {
  icon: {
    checked: chalk.green(figures.circleFilled),
    unchecked: figures.circle,
    cursor: figures.pointer,
  },
  style: {
    disabledChoice: (text: string) => chalk.dim(`- ${text}`),
    renderSelectedChoices: (selectedChoices) =>
      selectedChoices.map((choice) => choice.name || choice.value).join(', '),
  },
  helpMode: 'auto',
};

type Choice<Value> = {
  name?: string;
  value: Value;
  disabled?: boolean | string;
  checked?: boolean;
};

type Config<Value> = {
  message: string;
  prefix?: string;
  pageSize?: number;
  instructions?: string | boolean;
  choices: ReadonlyArray<Choice<Value>>;
  sortingLoop?: boolean;
  required?: boolean;
  validate?: (
    items: ReadonlyArray<Item<Value>>,
  ) => boolean | string | Promise<string | boolean>;
  theme?: PartialDeep<Theme<SortableCheckboxTheme>>;
};

type Item<Value> = Choice<Value>;

export default createPrompt(
  <Value extends unknown>(config: Config<Value>, done: (value: Array<Value>) => void) => {
    const {
      instructions,
      pageSize = 7,
      choices,
      required,
      validate = () => true,
    } = config;
    const theme = makeTheme<SortableCheckboxTheme>(checkboxTheme, config.theme);
    const prefix = usePrefix({ theme });
    const firstRender = useRef(true);
    const [status, setStatus] = useState('pending');
    const [items, setItems] = useState<ReadonlyArray<Item<Value>>>(
      choices.map((choice) => ({ ...choice })),
    );

    const bounds = useMemo(() => {
      const first = items.findIndex(isSelectable);
      const last = items.findLastIndex(isSelectable);

      if (first < 0) {
        throw new ValidationError(
          '[checkbox prompt] No selectable choices. All choices are disabled.',
        );
      }

      return { first, last };
    }, [items]);

    const [active, setActive] = useState(bounds.first);
    const [showHelpTip, setShowHelpTip] = useState(true);
    const [errorMsg, setError] = useState<string | undefined>(undefined);

    useKeypress(async (key) => {
      if (isEnterKey(key)) {
        const selection = items.filter(isChecked);
        const isValid = await validate([...selection]);
        if (required && !items.some(isChecked)) {
          setError('At least one choice must be selected');
        } else if (isValid === true) {
          setStatus('done');
          done(selection.map((choice) => choice.value));
        } else {
          setError(isValid || 'You must select a valid value');
        }
      } else if (isActivateNextItemKey(key) || isActivatePreviousItemKey(key)) {
        if (
          (isActivatePreviousItemKey(key) && active !== bounds.first) ||
          (isActivateNextItemKey(key) && active !== bounds.last)
        ) {
          const offset = isUpKey(key) ? -1 : 1;
          let next = active;
          do {
            next = (next + offset + items.length) % items.length;
          } while (!isSelectable(items[next]!));
          setActive(next);
        }
      } else if (isSpaceKey(key)) {
        setError(undefined);
        setShowHelpTip(false);
        setItems(items.map((choice, i) => (i === active ? toggle(choice) : choice)));
      } else if (key.name === 'a') {
        const selectAll = Boolean(
          items.find((choice) => isSelectable(choice) && !choice.checked),
        );
        setItems(items.map(check(selectAll)));
      } else if (key.name === 'i') {
        setItems(items.map(toggle));
      } else if (isNumberKey(key)) {
        // Adjust index to start at 1
        const position = Number(key.name) - 1;
        const item = items[position];
        if (item != null && isSelectable(item)) {
          setActive(position);
          setItems(items.map((choice, i) => (i === position ? toggle(choice) : choice)));
        }
      } else if (isMoveItemUpKey(key) || isMoveItemDownKey(key)) {
        if (items.length < 2) {
          return;
        }

        const offset = isMoveItemUpKey(key) ? -1 : 1;
        let moveActiveTo = active + offset;

        if (
          !config.sortingLoop &&
          (moveActiveTo < 0 || moveActiveTo > items.length - 1)
        ) {
          return;
        }

        let newItems: Array<Item<Value>>;

        if (moveActiveTo === -1) {
          newItems = [...items.slice(1), items[0]!];
          moveActiveTo = items.length - 1;
        } else if (moveActiveTo === items.length) {
          newItems = [items.at(-1)!, ...items.slice(0, -1)];
          moveActiveTo = 0;
        } else {
          newItems = [...items];
          newItems[moveActiveTo] = items[active]!;
          newItems[active] = items[moveActiveTo]!;
        }

        setItems(newItems);
        setActive(moveActiveTo);
      }
    });

    const message = theme.style.message(config.message);

    const page = usePagination<Item<Value>>({
      items,
      active,
      renderItem({ item, isActive }: { item: Item<Value>; isActive: boolean }) {
        const line = item.name || item.value;
        if (item.disabled) {
          const disabledLabel =
            typeof item.disabled === 'string' ? item.disabled : '(disabled)';
          return theme.style.disabledChoice(`${line} ${disabledLabel}`);
        }

        const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked;
        const color = isActive ? theme.style.highlight : (x: string) => x;
        const cursor = isActive ? theme.icon.cursor : ' ';
        return color(`${cursor}${checkbox} ${line}`);
      },
      pageSize,
      loop: false,
    });

    if (status === 'done') {
      const selection = items.filter(isChecked);
      const answer = theme.style.answer(
        theme.style.renderSelectedChoices(selection, items),
      );

      return `${prefix} ${message} ${answer}`;
    }

    let helpTipTop = '';
    let helpTipBottom = '';
    if (
      theme.helpMode === 'always' ||
      (theme.helpMode === 'auto' &&
        showHelpTip &&
        (instructions === undefined || instructions))
    ) {
      if (typeof instructions === 'string') {
        helpTipTop = instructions;
      } else {
        const keys = [
          `${theme.style.key('space')} to select`,
          `${theme.style.key('a')} to toggle all`,
          `${theme.style.key('i')} to invert selection`,
          `${theme.style.key('ctrl+up')} to move item up`,
          `${theme.style.key('ctrl+down')} to move item down`,
          `and ${theme.style.key('enter')} to proceed`,
        ];
        helpTipTop = ` (Press ${keys.join(', ')})`;
      }

      if (
        items.length > pageSize &&
        (theme.helpMode === 'always' ||
          (theme.helpMode === 'auto' && firstRender.current))
      ) {
        helpTipBottom = `\n${theme.style.help('(Use arrow keys to reveal more choices)')}`;
        firstRender.current = false;
      }
    }

    let error = '';
    if (errorMsg) {
      error = `\n${theme.style.error(errorMsg)}`;
    }

    return `${prefix} ${message}${helpTipTop}\n${page}${helpTipBottom}${error}${ansiEscapes.cursorHide}`;
  },
);

function isSelectable<Value>(item: Item<Value>): item is Choice<Value> {
  return !item.disabled;
}

function isChecked<Value>(item: Item<Value>): item is Choice<Value> {
  return isSelectable(item) && Boolean(item.checked);
}

function toggle<Value>(item: Item<Value>): Item<Value> {
  return isSelectable(item) ? { ...item, checked: !item.checked } : item;
}

function check(checked: boolean) {
  return function <Value>(item: Item<Value>): Item<Value> {
    return isSelectable(item) ? { ...item, checked } : item;
  };
}

function isActivatePreviousItemKey(key: KeypressEvent): boolean {
  return isUpKey(key) && !key.ctrl;
}

function isActivateNextItemKey(key: KeypressEvent): boolean {
  return isDownKey(key) && !key.ctrl;
}

function isMoveItemUpKey(key: KeypressEvent): boolean {
  return key.ctrl && isUpKey(key);
}

function isMoveItemDownKey(key: KeypressEvent): boolean {
  return key.ctrl && isDownKey(key);
}
