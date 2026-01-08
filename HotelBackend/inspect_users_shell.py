
from accounts.models import CustomUser
from rest_framework.authtoken.models import Token

print("\n" + "=" * 80)
print(f"{'Username':<15} | {'Role':<12} | {'Active':<6} | {'Group':<10} | {'Has Token'}")
print("-" * 80)

for user in CustomUser.objects.all():
    has_token = Token.objects.filter(user=user).exists()
    print(f"{user.username:<15} | {user.role:<12} | {str(user.is_active):<6} | {str(user.group_id):<10} | {has_token}")

print("=" * 80 + "\n")
