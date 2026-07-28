# Platform Protocol v1

## Scope

第一阶段只增加数据协议、兼容读取和验证，不重写实验页面，不改变物理计算和现有用户界面。

## Existing data

教材数据保留 `books`、`chapters`、`summary`；模型数据保留 `id`、`chapterId`、`title`、`category`、`visual`、`summary`、`hook`、`model`、`relations`、`explore`、`misconceptions`、`prerequisite`、`status`、`lab` 和 `featured`。

## Versioning

当前协议版本为 `1`。模型和课程根对象都增加 `schemaVersion`。新字段缺失时由兼容层提供空数组或空字符串，不影响旧模型页面。

## Optional fields

`parameters`、`observables`、`formulas`、`assumptions`、`boundaries`、`studentTasks` 和 `teacherTasks` 均为可选字段。第一阶段只校验，不强制所有实验接入。
