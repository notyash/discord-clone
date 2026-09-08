-- db/schema/001_tables.surql

DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD username ON user TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD email ON user TYPE string ASSERT string::is_email($value);
DEFINE FIELD pass ON user TYPE string;
DEFINE FIELD created_at ON user TYPE datetime DEFAULT time::now();
DEFINE INDEX unique_email ON user COLUMNS email UNIQUE;

DEFINE TABLE trusted_device SCHEMAFULL;
DEFINE FIELD user ON trusted_device TYPE record<user>;
DEFINE FIELD device_id ON trusted_device TYPE string;
DEFINE FIELD trusted ON trusted_device TYPE bool DEFAULT true;
DEFINE FIELD last_seen ON trusted_device TYPE datetime DEFAULT time::now();
DEFINE INDEX unique_device ON trusted_device COLUMNS user, device_id UNIQUE;

DEFINE TABLE channel SCHEMAFULL;
DEFINE FIELD name ON channel TYPE string;
DEFINE FIELD created_at ON channel TYPE datetime DEFAULT time::now();

DEFINE TABLE message SCHEMAFULL;
DEFINE FIELD channel ON message TYPE record<channel>;
DEFINE FIELD user ON message TYPE record<user>;
DEFINE FIELD content ON message TYPE string;
DEFINE FIELD created_at ON message TYPE datetime DEFAULT time::now();

DEFINE TABLE member_of TYPE RELATION FROM user TO channel SCHEMAFULL;
DEFINE FIELD joined_at ON member_of TYPE datetime DEFAULT time::now();