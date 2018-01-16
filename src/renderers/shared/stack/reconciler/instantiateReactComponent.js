/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule instantiateReactComponent
 */

'use strict';

var ReactCompositeComponent = require('ReactCompositeComponent');
var ReactEmptyComponent = require('ReactEmptyComponent');
var ReactHostComponent = require('ReactHostComponent');

var getNextDebugID = require('getNextDebugID');
var invariant = require('invariant');
var warning = require('warning');

// To avoid a cyclic dependency, we create the final class in this module
var ReactCompositeComponentWrapper = function(element) {
  this.construct(element);
};

function getDeclarationErrorAddendum(owner) {
  if (owner) {
    var name = owner.getName();
    if (name) {
      return ' Check the render method of `' + name + '`.';
    }
  }
  return '';
}

/**
 * Check if the type reference is a known internal type. I.e. not a user
 * provided composite type.
 *
 * @param {function} type
 * @return {boolean} Returns true if this is a valid internal type.
 */
function isInternalComponentType(type) {
  return (
    typeof type === 'function' &&
    typeof type.prototype !== 'undefined' &&
    typeof type.prototype.mountComponent === 'function' &&
    typeof type.prototype.receiveComponent === 'function'
  );
}

/**
 * Given a ReactNode, create an instance that will actually be mounted.
 *
 * @param {ReactNode} node
 * @param {boolean} shouldHaveDebugID
 * @return {object} A new instance of the element's constructor.
 * @protected
 */
function instantiateReactComponent(node, shouldHaveDebugID) {
  var instance;

  // node 为空，node 不存在，初始化 ReactEmptyComponent
  if (node === null || node === false) {
    instance = ReactEmptyComponent.create(instantiateReactComponent);
  } else if (typeof node === 'object') { // node 是 DOM 标签组件或者自定义组件
    var element = node;
    var type = element.type;
    if (typeof type !== 'function' && typeof type !== 'string') {
      var info = '';
      if (__DEV__) {
        if (
          type === undefined ||
          (typeof type === 'object' &&
            type !== null &&
            Object.keys(type).length === 0)
        ) {
          info +=
            ' You likely forgot to export your component from the file ' +
            "it's defined in.";
        }
      }
      info += getDeclarationErrorAddendum(element._owner);
      invariant(
        false,
        'Element type is invalid: expected a string (for built-in components) ' +
          'or a class/function (for composite components) but got: %s.%s',
        type == null ? type : typeof type,
        info,
      );
    }

    // Special case string values
    // element 类型为字符串，DOM 标签（ReactDOMComponent）
    if (typeof element.type === 'string') {
      instance = ReactHostComponent.createInternalComponent(element);
    } else if (isInternalComponentType(element.type)) { // 初始化自定义组件
      // This is temporarily available for custom components that are not string
      // representations. I.e. ART. Once those are updated to use the string
      // representation, we can drop this code path.
      // 不是字符串表示的自定义组件暂无法使用，此处不做组件初始化操作。
      instance = new element.type(element);

      // We renamed this. Allow the old name for compat. :(
      if (!instance.getHostNode) {
        instance.getHostNode = instance.getNativeNode;
      }
    } else {
      // 自定义组件（ReactCompositeComponent）
      instance = new ReactCompositeComponentWrapper(element);
    }
  } else if (typeof node === 'string' || typeof node === 'number') {
    // node 类型为字符串或数字（ReactTextComponent）
    instance = ReactHostComponent.createInstanceForText(node);
  } else {
    invariant(false, 'Encountered invalid React node of type %s', typeof node);
  }

  if (__DEV__) {
    warning(
      typeof instance.mountComponent === 'function' &&
        typeof instance.receiveComponent === 'function' &&
        typeof instance.getHostNode === 'function' &&
        typeof instance.unmountComponent === 'function',
      'Only React Components can be mounted.',
    );
  }

  // These two fields are used by the DOM and ART diffing algorithms
  // respectively. Instead of using expandos on components, we should be
  // storing the state needed by the diffing algorithms elsewhere.
  // 出事化参数
  instance._mountIndex = 0;
  instance._mountImage = null;

  if (__DEV__) {
    instance._debugID = shouldHaveDebugID ? getNextDebugID() : 0;
  }

  // Internal instances should fully constructed at this point, so they should
  // not get any new fields added to them at this point.
  if (__DEV__) {
    if (Object.preventExtensions) {
      Object.preventExtensions(instance);
    }
  }

  return instance;
}

Object.assign(
  ReactCompositeComponentWrapper.prototype,
  ReactCompositeComponent,
  {
    _instantiateReactComponent: instantiateReactComponent,
  },
);

module.exports = instantiateReactComponent;
