import ClassNames from "classnames";
import _ from "lodash";
import BasicFieldComponent from "./BasicFieldComponent";

interface Props {
  size?: number;
}
export default class BasicSizedComponent<T> extends BasicFieldComponent<
  Props & T
> {
  sizeClassName() {
    if (this.props.size && !Number.isInteger(this.props.size)) {
      return this.props.size;
    } else {
      return undefined;
    }
  }

  resolveClassName(className: string) {
    const classNames = ClassNames(
      className,
      { error: this.props.hasError },
      this.sizeClassName()
    );
    return !_.isEmpty(classNames) ? classNames : undefined;
  }
}
