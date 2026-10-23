import type { Link, Parent, PhrasingContent, Root, Text } from 'mdast';
import { splitIssueMentions } from './mentions';

/**
 * remark plugin: หา "TB-12" ในข้อความ Markdown แล้วแปลงเป็นลิงก์ /issues/TB-12
 * ที่มี attribute data-issue-key → MarkdownView จะเปลี่ยนลิงก์นี้เป็น <IssueMentionChip>
 *
 * remark ทำงานกับ "mdast" (ต้นไม้ของ Markdown) — เราเดินทุก node แล้วแก้เฉพาะ node ชนิด text
 * code block (`code`) และ inline code (`inlineCode`) เป็นคนละชนิด จึงไม่ถูกแปลงโดยอัตโนมัติ
 * และข้ามข้อความที่อยู่ในลิงก์อยู่แล้ว (ไม่ทำลิงก์ซ้อนลิงก์)
 */
export function remarkIssueMentions() {
  return (tree: Root) => {
    visit(tree);
  };
}

function visit(node: Parent): void {
  if (node.type === 'link' || node.type === 'linkReference') return;

  const nextChildren: Parent['children'] = [];
  for (const child of node.children) {
    if (child.type === 'text') {
      nextChildren.push(...textToNodes(child));
    } else {
      if ('children' in child) visit(child);
      nextChildren.push(child);
    }
  }
  node.children = nextChildren;
}

function textToNodes(textNode: Text): PhrasingContent[] {
  const parts = splitIssueMentions(textNode.value);
  if (parts.length === 1 && parts[0]?.kind === 'text') return [textNode];

  return parts.map((part): PhrasingContent => {
    if (part.kind === 'text') return { type: 'text', value: part.value };
    const link: Link = {
      type: 'link',
      url: `/issues/${part.key}`,
      children: [{ type: 'text', value: part.key }],
      // hProperties = attribute ที่จะติดไปกับ <a> ตอนแปลงเป็น HTML
      data: { hProperties: { 'data-issue-key': part.key } },
    };
    return link;
  });
}
