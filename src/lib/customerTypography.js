export const customerTypography = (text) =>
  typeof text === 'string' ? text.replace(/[\u2012-\u2015\u2e3a\u2e3b]/g, '-') : text;

// Markdown text only: never rewrite code, link destinations or image URLs.
export function remarkCustomerTypography() {
  return function visit(node) {
    if (node.type === 'text') node.value = customerTypography(node.value);
    for (const child of node.children || []) visit(child);
  };
}
