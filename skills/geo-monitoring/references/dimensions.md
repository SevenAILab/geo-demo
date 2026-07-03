# 六维看板

| id | label | 衡量 |
|----|-------|------|
| schema | Schema.org 标记 | JSON-LD 覆盖与正确性 |
| llms | llms.txt 指令 | 文件存在与指令完整度 |
| entity | 实体关联 | sameAs / 品牌一致性 |
| answer | 答案就绪度 | FAQ/事实块可引用性 |
| search | 搜索覆盖度 | 关键查询页面覆盖 |
| trust | 信息可信度 | 出处、数据可验证性 |

修复包部署后 schema/llms/entity 应高于体检基线。
