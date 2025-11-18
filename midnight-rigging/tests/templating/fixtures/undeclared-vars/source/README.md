# {{project_name}}

This template contains undeclared variables that should be left as literal placeholders:

- {{undeclared_var}} - not in template.yaml
- {{another_undeclared}} - also not declared
- {{foo}} - undeclared

But declared variables work:
- Project: {{project_name}}
- Target: {{TARGET_DIR}}

The undeclared variables above should remain as {{undeclared_var}}, {{another_undeclared}}, and {{foo}} in the rendered output.
