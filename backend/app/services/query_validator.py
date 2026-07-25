import ast

class QueryValidator(ast.NodeVisitor):
    def __init__(self, allowed_columns):
        self.allowed_columns = set(allowed_columns)
        self.errors = []
        
    def visit_Name(self, node):
        if node.id not in self.allowed_columns and node.id not in ["True", "False"]:
            self.errors.append(f"Invalid column or variable: {node.id}")
        self.generic_visit(node)
        
    def visit_Call(self, node):
        self.errors.append(f"Function calls are not allowed: {node.func.id if hasattr(node.func, 'id') else 'unknown'}")
        self.generic_visit(node)
        
    def visit_Attribute(self, node):
        self.errors.append(f"Attributes are not allowed: {node.attr}")
        self.generic_visit(node)

def validate_query(query: str, allowed_columns: list) -> tuple[bool, list[str]]:
    try:
        tree = ast.parse(query, mode='eval')
        validator = QueryValidator(allowed_columns)
        validator.visit(tree)
        return len(validator.errors) == 0, validator.errors
    except Exception as e:
        return False, [f"Syntax error: {str(e)}"]
