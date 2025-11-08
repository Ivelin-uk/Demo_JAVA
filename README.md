# Hello Spring Application

Просто Java Spring Boot приложение, което изпечатва "Hello" на страницата.

## Изисквания

- Java 17 или по-нова версия
- Maven 3.6+ (или използвайте Maven Wrapper)

## Как да стартирате приложението

### Използване на Maven

```bash
mvn clean install
mvn spring-boot:run
```

### Използване на Java

```bash
mvn clean package
java -jar target/hello-spring-app-1.0.0.jar
```

## Достъп до приложението

След стартиране на приложението, отворете браузър и отидете на:

```
http://localhost:8080
```

Ще видите съобщението "Hello" на страницата.

## Структура на проекта

```
.
├── pom.xml
├── src
│   └── main
│       ├── java
│       │   └── com
│       │       └── example
│       │           ├── HelloSpringApplication.java
│       │           └── controller
│       │               └── HelloController.java
│       └── resources
│           └── application.properties
└── README.md
```

## Технологии

- Spring Boot 3.2.0
- Java 17
- Maven
# Demo_JAVA
