from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import os
import time

app = Flask(__name__, static_folder='.', static_url_path='')

# 初始化数据库
def init_db():
    conn = sqlite3.connect('workshop.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS works (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uploader TEXT NOT NULL,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            size INTEGER NOT NULL,
            upload_time INTEGER NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# 获取所有作品
@app.route('/api/works', methods=['GET'])
def get_works():
    conn = sqlite3.connect('workshop.db')
    c = conn.cursor()
    c.execute('SELECT id, uploader, filename, content, size, upload_time FROM works ORDER BY upload_time DESC')
    rows = c.fetchall()
    conn.close()
    
    works = []
    for row in rows:
        works.append({
            'id': row[0],
            'uploader': row[1],
            'filename': row[2],
            'content': row[3],
            'size': row[4],
            'uploadTime': row[5]
        })
    return jsonify(works)

# 上传作品
@app.route('/api/upload', methods=['POST'])
def upload_work():
    data = request.get_json()
    uploader = data.get('uploader', '')
    filename = data.get('filename', '')
    content = data.get('content', '')
    
    if not uploader or not filename or not content:
        return jsonify({'error': '参数不完整'}), 400
    
    if not filename.lower().endswith('.txt'):
        return jsonify({'error': '只支持TXT文件'}), 400
    
    size = len(content)
    upload_time = int(time.time() * 1000)
    
    conn = sqlite3.connect('workshop.db')
    c = conn.cursor()
    c.execute('INSERT INTO works (uploader, filename, content, size, upload_time) VALUES (?, ?, ?, ?, ?)',
              (uploader, filename, content, size, upload_time))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    
    return jsonify({'id': new_id, 'message': '上传成功'})

# 删除作品
@app.route('/api/delete/<int:work_id>', methods=['DELETE'])
def delete_work(work_id):
    conn = sqlite3.connect('workshop.db')
    c = conn.cursor()
    c.execute('DELETE FROM works WHERE id = ?', (work_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': '删除成功'})

# 清空全部
@app.route('/api/clear', methods=['DELETE'])
def clear_works():
    conn = sqlite3.connect('workshop.db')
    c = conn.cursor()
    c.execute('DELETE FROM works')
    conn.commit()
    conn.close()
    return jsonify({'message': '清空成功'})

# 首页
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    init_db()
    print('数据库已就绪！')
    print('打开浏览器访问：http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)