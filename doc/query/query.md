# 개요
`makeCrud` 함수를 통해 만든 api의 쿼리 방법.  
전체적으로 sequelize 쿼리를 거의 그대로 활용한다.  
내부적으로 키나 값을 적절하게 변경하여 sequelize 쿼리를 수행한다.  

# method
rest 규칙을 따른다.  
- create: POST
- read: GET
- update: PUT
- delete: DELETE

# 매개변수
다음 두가지 매개변수를 이용한다.  
- options: where등을 포함하는 쿼리에 사용되는 부분. (형식은 sequelize 참고)  
- params: 값의 변경이나 추가를 위한 부분. update나 create할때 사용함.  

# 간단 예제
