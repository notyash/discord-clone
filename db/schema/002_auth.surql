DEFINE ACCESS OVERWRITE account ON DATABASE TYPE RECORD
    SIGNUP (
        CREATE user SET
            username = $username,
            email = $email,
            pass = crypto::argon2::generate($pass)
    )
    SIGNIN (
        SELECT * FROM user
        WHERE email = $email
        AND crypto::argon2::compare(pass, $pass)
    )
    DURATION FOR TOKEN 7d, FOR SESSION 7d;