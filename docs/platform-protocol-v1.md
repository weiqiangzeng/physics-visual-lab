# Platform Protocol v1

## Scope

协议层为 39 个实验提供兼容读取、验证、URL 状态和学习记录基础能力；各实验保留独立物理模型与状态命名。

## Existing data

教材数据保留 `books`、`chapters`、`summary`；模型数据保留 `id`、`chapterId`、`title`、`category`、`visual`、`summary`、`hook`、`model`、`relations`、`explore`、`misconceptions`、`prerequisite`、`status`、`lab` 和 `featured`。

## Versioning

当前协议版本为 `1`。模型和课程根对象都增加 `schemaVersion`。新字段缺失时由兼容层提供空数组或空字符串，不影响旧模型页面。

## Optional fields

`parameters`、`observables`、`formulas`、`assumptions`、`boundaries`、`studentTasks` 和 `teacherTasks` 均为可选字段。页面级学生任务与教师路线由平台清单提供，协议数组仍保持向后兼容。
