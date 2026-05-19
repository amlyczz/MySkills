"""
Template loader — auto-discovers all template_*.py files in this directory.
Each module must export: NAME, INTRO_HTML, OUTRO_HTML
"""

import importlib
import os
import re

TEMPLATES = []

# Load all template_*.py modules
_tpl_dir = os.path.dirname(__file__)
for _fname in sorted(os.listdir(_tpl_dir)):
    _m = re.match(r'(template_\d+_.+)\.py$', _fname)
    if _m:
        _mod_name = _m.group(1)
        _mod = importlib.import_module(f'templates.{_mod_name}')
        TEMPLATES.append((_mod.INTRO_HTML, _mod.OUTRO_HTML, getattr(_mod, 'NAME', _mod_name)))

def get_template_names():
    """Return list of template names for display."""
    return [name for _, _, name in TEMPLATES]
