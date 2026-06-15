import { IInput } from 'types/Input';
import { useTranslation } from 'components/i18n/Translator';

import { CheckboxInput, CheckboxInputProps } from './CheckboxInput';
import { DatePickerInput, DatePickerInputProps } from './DatePickerInput';
import { MultiSelectInput, MultiSelectInputProps } from './MultiSelectInput';
import { RadioButtonGroup, RadioButtonGroupProps } from './RadioButtonGroup';
import { SelectInput, SelectInputProps } from './SelectInput';
import { SliderInput, SliderInputProps } from './SliderInput';
import { SwitchInput, SwitchInputProps } from './SwitchInput';
import { TagsInput, TagsInputProps } from './TagsInput';
import { TextInput, TextInputProps } from './TextInput';

type TFormInputValue = string | number | boolean | string[] | undefined;

interface IFormInput<T, V extends TFormInputValue> extends IInput {
  type: T;
  value?: V;
  initial?: V;
  setField?(field: string, value: V, shouldValidate?: boolean): void;
}

type TFormInput =
  | (Omit<SwitchInputProps, 'checked'> & IFormInput<'switch', boolean>)
  | (Omit<SliderInputProps, 'value'> & IFormInput<'slider', number>)
  | (Omit<TagsInputProps, 'value'> & IFormInput<'tags', string[]>)
  | (Omit<SelectInputProps, 'value'> & IFormInput<'select', string>)
  | (Omit<TextInputProps, 'value'> & IFormInput<'textinput', string>)
  | (Omit<TextInputProps, 'value'> & IFormInput<'numberinput', number>)
  | (Omit<MultiSelectInputProps, 'value'> & IFormInput<'multiselect', string[]>)
  | (Omit<CheckboxInputProps, 'checked'> & IFormInput<'checkbox', boolean>)
  | (Omit<RadioButtonGroupProps, 'value'> & IFormInput<'radio', string>)
  | (DatePickerInputProps &
      IFormInput<'datepicker', string | [string, string]>);

const FormInput = ({ element }: { element: TFormInput }): JSX.Element => {
  const { i18n, t } = useTranslation();
  const translatedElement = localizeChatSettingsInput(element, i18n, t);

  switch (translatedElement?.type) {
    case 'select':
      return (
        <SelectInput
          {...translatedElement}
          value={translatedElement.value ?? ''}
        />
      );
    case 'slider':
      return (
        <SliderInput
          {...translatedElement}
          value={translatedElement.value ?? 0}
        />
      );
    case 'tags':
      return (
        <TagsInput
          {...translatedElement}
          value={translatedElement.value ?? []}
        />
      );
    case 'switch':
      return (
        <SwitchInput
          {...translatedElement}
          checked={!!translatedElement.value}
        />
      );
    case 'textinput':
      return (
        <TextInput
          {...translatedElement}
          value={translatedElement.value ?? ''}
        />
      );
    case 'numberinput':
      return (
        <TextInput
          {...translatedElement}
          type="number"
          value={translatedElement.value?.toString() ?? '0'}
        />
      );
    case 'multiselect':
      return (
        <MultiSelectInput
          {...translatedElement}
          value={translatedElement.value ?? []}
        />
      );
    case 'checkbox':
      return (
        <CheckboxInput
          {...translatedElement}
          checked={!!translatedElement.value}
        />
      );
    case 'radio':
      return (
        <RadioButtonGroup
          {...translatedElement}
          value={translatedElement.value ?? ''}
        />
      );
    case 'datepicker':
      return (
        <DatePickerInput
          {...translatedElement}
          value={translatedElement.value}
        />
      );
    default:
      // If the element type is not recognized, we indicate an unimplemented type.
      // This code path should not normally occur and serves as a fallback.
      translatedElement satisfies never;
      return <></>;
  }
};

function localizeChatSettingsInput(
  element: TFormInput,
  i18n: ReturnType<typeof useTranslation>['i18n'],
  t: ReturnType<typeof useTranslation>['t']
): TFormInput {
  const basePath = `chat.settings.inputs.${element.id}`;
  const labelPath = `${basePath}.label`;
  const descriptionPath = `${basePath}.description`;

  return {
    ...element,
    label: i18n.exists(labelPath) ? t(labelPath) : element.label,
    description: i18n.exists(descriptionPath)
      ? t(descriptionPath)
      : element.description
  };
}

export { FormInput };
export type { IFormInput, TFormInput, TFormInputValue };
