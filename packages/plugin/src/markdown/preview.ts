/* eslint-disable no-param-reassign */
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import path from 'path';
import {
  composeComponentName,
  handleComponentName,
  injectComponentImportScript,
} from './utils';

const titleRegex = /title="(.*?)"/;
const vuePathRegex = /vue="(.*?)"/;
const htmlPathRegex = /html="(.*?)"/;
const reactPathRegex = /react="(.*?)"/;
const descriptionRegex = /description="(.*?)"/;

export interface DefaultProps {
  vue?: string;
  title?: string;
  description?: string;
  html?: string;
  react?: string;
}

export interface VitepressDemoBoxConfig {
  /**
   * @description demo所在目录
   */
  demoRoot?: string;
  /**
   * @description 代码切换 tab 的展示顺序
   */
  tabOrders?: ('vue' | 'react' | 'html')[];
  /**
   * @description 是否显示代码切换 tab
   */
  showTabs?: boolean;
  /**
   * @description 默认选中的 tab
   */
  defaultTab?: boolean;
}

/**
 * 编译预览组件
 * @param md
 * @param token
 * @param mdFile
 * @param demoRoot
 * @returns
 */
export const transformPreview = (
  md: MarkdownIt,
  token: Token,
  mdFile: any,
  config?: VitepressDemoBoxConfig
) => {
  const {
    demoRoot,
    tabOrders = ['vue', 'react', 'html'],
    showTabs = true,
    defaultTab = config?.tabOrders?.[0] || 'vue',
  } = config || {};

  const componentProps: DefaultProps = {
    vue: '',
    title: '',
    description: '',
    html: '',
    react: '',
  };

  // 获取Props相关参数
  const titleValue = token.content.match(titleRegex);
  const vuePathRegexValue = token.content.match(vuePathRegex);
  const htmlPathRegexValue = token.content.match(htmlPathRegex);
  const reactPathRegexValue = token.content.match(reactPathRegex);
  const descriptionRegexValue = token.content.match(descriptionRegex);

  const dirPath = demoRoot || path.dirname(mdFile.path);

  if (vuePathRegexValue?.[1]) {
    componentProps.vue = path
      .join(dirPath, vuePathRegexValue[1])
      .replace(/\\/g, '/');
  }

  if (htmlPathRegexValue?.[1]) {
    componentProps.html = path
      .join(dirPath, htmlPathRegexValue[1])
      .replace(/\\/g, '/');
  }
  if (reactPathRegexValue?.[1]) {
    componentProps.react = path
      .join(dirPath, reactPathRegexValue[1])
      .replace(/\\/g, '/');
  }

  componentProps.title = titleValue ? titleValue[1] : '';
  componentProps.description = descriptionRegexValue
    ? descriptionRegexValue[1]
    : '';

  const componentVuePath = componentProps.vue
    ? path
        .resolve(
          demoRoot || path.dirname(mdFile.path),
          vuePathRegexValue?.[1] || '.'
        )
        .replace(/\\/g, '/')
    : '';
  const componentHtmlPath = componentProps.html
    ? path
        .resolve(
          demoRoot || path.dirname(mdFile.path),
          htmlPathRegexValue?.[1] || '.'
        )
        .replace(/\\/g, '/')
    : '';
  const componentReactPath = componentProps.react
    ? path
        .resolve(
          demoRoot || path.dirname(mdFile.path),
          reactPathRegexValue?.[1] || '.'
        )
        .replace(/\\/g, '/')
    : '';

  // 组件名
  // eslint-disable-next-line prefer-destructuring
  const absolutePath = path
    .resolve(
      dirPath,
      componentProps.vue || componentProps.react || componentProps.html || '.'
    )
    .replace(/\\/g, '/');

  const componentName = composeComponentName(absolutePath);
  const reactComponentName = handleComponentName(`react-${componentName}`);

  // 注入 vitepress-demo-box 组件和样式
  injectComponentImportScript(
    mdFile,
    'vitepress-demo-box',
    `{ VitepressDemoBox }`
  );
  injectComponentImportScript(mdFile, 'vitepress-demo-box/dist/style.css');

  // 注入组件导入语句
  if (componentProps.vue) {
    injectComponentImportScript(mdFile, componentVuePath, componentName);
  }
  if (componentProps.react) {
    injectComponentImportScript(
      mdFile,
      'react',
      '{ createElement as reactCreateElement }'
    );
    injectComponentImportScript(
      mdFile,
      'react-dom/client',
      '{ createRoot as reactCreateRoot }'
    );
    injectComponentImportScript(mdFile, componentReactPath, reactComponentName);
  }

  // 组件代码，动态引入以便实时更新
  const htmlCode = componentProps.html
    ? handleComponentName(`code-html-${componentName}`)
    : `''`;
  const reactCode = componentProps.react
    ? handleComponentName(`code-react-${componentName}`)
    : `''`;
  const vueCode = componentProps.vue
    ? handleComponentName(`code-vue-${componentName}`)
    : `''`;
  if (componentProps.html) {
    injectComponentImportScript(mdFile, `${componentHtmlPath}?raw`, htmlCode);
  }
  if (componentProps.react) {
    injectComponentImportScript(mdFile, `${componentReactPath}?raw`, reactCode);
  }
  if (componentProps.vue) {
    injectComponentImportScript(mdFile, `${componentVuePath}?raw`, vueCode);
  }

  const sourceCode = `<vitepress-demo-box 
    title="${componentProps.title}"
    description="${componentProps.description}"
    defaultTab="${defaultTab}"
    tabOrders="${encodeURIComponent(JSON.stringify(tabOrders))}"
    :showTabs="!!${showTabs}"
    :htmlCode="${encodeURIComponent(htmlCode)}"
    :vueCode="${encodeURIComponent(vueCode)}"
    :reactCode="${encodeURIComponent(reactCode)}"
    :reactComponent="${reactComponentName}"
    :reactCreateRoot="reactCreateRoot"
    :reactCreateElement="reactCreateElement"
    >
    <template #vue>
      <${componentName}></${componentName}>
    </template>
  </vitepress-demo-box>`;

  return sourceCode;
};
