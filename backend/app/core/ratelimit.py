from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance. Imported by main (to wire handlers) and by routes
# (to decorate endpoints), so it lives here to avoid circular imports.
limiter = Limiter(key_func=get_remote_address)
