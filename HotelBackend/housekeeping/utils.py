from exponent_server_sdk import (
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
from requests.exceptions import ConnectionError, HTTPError

def send_push_notification(token, title, message, extra=None):
    """
    Sends a single push notification to an Expo Push Token.
    """
    if not token:
        return

    try:
        response = PushClient().publish(
            PushMessage(to=token,
                        title=title,
                        body=message,
                        data=extra)
        )
    except PushServerError as exc:
        # Encountered some likely formatting/validation error.
        print(f"Token {token} - PushServerError: {exc.errors}")
    except (ConnectionError, HTTPError) as exc:
        # Encountered some Connection or HTTP error - retry a few times in case it is transient.
        print(f"Token {token} - ConnectionError: {exc}")

    try:
        # We got a response back, but we don't know whether it's an error yet.
        # This call raises errors so we can handle them with normal exception flows.
        if response and response.status != 'ok':
             print(f"Token {token} - Response Error: {response.message}")
    except Exception as e:
         print(f"Token {token} - General Error: {e}")

def send_multicast_push(users, title, message, extra=None):
    """
    Sends to a list of Users (who have expo_push_token).
    """
    tokens = []
    for user in users:
        if user.expo_push_token:
            tokens.append(user.expo_push_token)
    
    # Simple loop for MVP. Expo SDK supports chunking, but let's keep it simple.
    # ideally we use publish_multiple
    if not tokens:
        return

    print(f"Sending Push to {len(tokens)} devices: {title}")
    
    # Efficient Batch Sending
    messages = [
        PushMessage(to=t, title=title, body=message, data=extra)
        for t in tokens
    ]
    
    try:
        PushClient().publish_multiple(messages)
    except Exception as e:
        print(f"Multicast Error: {e}")
