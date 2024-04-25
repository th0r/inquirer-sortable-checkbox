# Sortable checkbox list for Inquirer.js

Simple interactive command line prompt to display a sortable list of checkboxes (multi select).

![Sortable checkbox prompt](https://github.com/th0r/inquirer-sortable-checkbox/assets/302213/08c0cbef-87fb-40be-ad6a-f07d4e60aff4)

# Installation

```sh
npm install inquirer-sortable-checkbox

yarn add inquirer-sortable-checkbox
```

# Usage

```js
import sortableCheckbox from 'inquirer-sortable-checkbox';

const answer = await sortableCheckbox({
  message: 'Which PRs and in what order would you like to merge?',
  choices: [
    {
      name: 'PR 1',
      value: '#1',
    },
    {
      name: 'PR 2',
      value: '#2',
      disabled: true,
    },
    {
      name: 'PR 3',
      value: '#3',
      checked: true,
    },
  ],
});
```

## Options

| Property    | Type                                                                                    | Required | Description                                                                                                                                                                                           |
|-------------|-----------------------------------------------------------------------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| message     | `string`                                                                                | yes      | The question to ask                                                                                                                                                                                   |
| choices     | `Array<{ value: any, name?: string, disabled?: boolean \| string, checked?: boolean }>` | yes      | List of the available choices. The `value` will be returned as the answer, and used as display if no `name` is defined. Choices who're `disabled` will be displayed, but not selectable.              |
| pageSize    | `number`                                                                                | no       | By default, lists of choice longer than 7 will be paginated. Use this option to control how many choices will appear on the screen at once.                                                           |
| sortingLoop | `boolean`                                                                               | no       | Defaults to `false`. When set to `true`, moving first item up will move it to the end of the list, and moving last item down will move it to the start of the list.                                   |
| required    | `boolean`                                                                               | no       | When set to `true`, ensures at least one choice must be selected.                                                                                                                                     |
| validate    | `string\[\] => boolean \| string \| Promise<string \| boolean>`                         | no       | On submit, validate the choices. When returning a string, it'll be used as the error message displayed to the user. Note: returning a rejected promise, we'll assume a code error happened and crash. |
| theme       | [See Theming](#Theming)                                                                 | no       | Customize look of the prompt.                                                                                                                                                                         |

## Theming

You can theme a prompt by passing a `theme` object option. The theme object only need to includes the keys you wish to modify, we'll fallback on the defaults for the rest.

```ts
type Theme = {
  prefix: string;
  spinner: {
    interval: number;
    frames: string[];
  };
  style: {
    answer: (text: string) => string;
    message: (text: string) => string;
    error: (text: string) => string;
    defaultAnswer: (text: string) => string;
    help: (text: string) => string;
    highlight: (text: string) => string;
    key: (text: string) => string;
    disabledChoice: (text: string) => string;
    renderSelectedChoices: <T>(
      selectedChoices: ReadonlyArray<Choice<T>>,
      allChoices: ReadonlyArray<Choice<T> | Separator>,
    ) => string;
  };
  icon: {
    checked: string;
    unchecked: string;
    cursor: string;
  };
  helpMode: 'always' | 'never' | 'auto';
};
```

### `theme.helpMode`

- `auto` (default): Hide the help tips after an interaction occurs. The scroll tip will hide after any interactions, the selection and sorting tip will hide as soon as a first sorting is done.
- `always`: The help tips will always show and never hide.
- `never`: The help tips will never show.

# License

Licensed under the MIT license.
