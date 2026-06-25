import type { ColorValue, ViewProps } from 'react-native';

type Props = ViewProps & {
  color?: ColorValue;
};

export function RawPointerView(_props: Props): never {
  throw new Error(
    "'react-native-raw-pointer' is only supported on native platforms."
  );
}
